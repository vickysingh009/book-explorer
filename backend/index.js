// File: index.js
require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { spawn } = require('child_process');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const MONGO_DB = process.env.MONGO_DB || 'bookexplorer';
const SCRAPER_JSON = path.join(__dirname, '..', 'scraper', 'books.json');
const SCRAPER_PATH = process.env.SCRAPER_PATH || path.join(__dirname, '..', 'scraper', 'scraper.js');
const REFRESH_TOKEN = process.env.REFRESH_TOKEN || null; // optional: set to protect /api/refresh

let booksCache = [];
let Book = null;

// If MONGO_URI present, connect and load model
if (MONGO_URI) {
  mongoose.connect(MONGO_URI, { dbName: MONGO_DB, useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Mongo connect err', err.message));
  // require model (model file ensures schema & indexes)
  Book = require('./models/Book');
}

// loadBooks: reads scraper/books.json into booksCache. If importToDb=true and DB connected, imports into Mongo.
async function loadBooks({ importToDb = false } = {}){
  try{
    if(!fs.existsSync(SCRAPER_JSON)){
      console.warn('Could not find', SCRAPER_JSON);
      booksCache = [];
      return;
    }
    const raw = fs.readFileSync(SCRAPER_JSON, 'utf8');
    const parsed = JSON.parse(raw);
    if(!Array.isArray(parsed)) throw new Error('scraper/books.json should contain an array');
    booksCache = parsed.map((b, idx) => ({ _id: (b._id ? String(b._id) : idx.toString()), ...b }));

    if(importToDb && MONGO_URI && Book){
      try{
        // Replace collection with scraped data. You may want a safer merge in production.
        await Book.deleteMany({});
        await Book.insertMany(parsed);
        console.log('Imported scraped JSON into MongoDB');
      }catch(e){
        console.warn('Failed to import JSON into Mongo:', e.message);
      }
    }
  }catch(e){
    console.warn('Could not load scraper/books.json.', e.message);
    booksCache = [];
  }
}

// If not using DB, preload the cache now
if(!MONGO_URI){
  loadBooks().catch(()=>{});
}

// Helper: sanitize & parse pagination params
function parsePagination(q){
  const page = Math.max(1, Number(q.page) || 1);
  let limit = Number(q.limit) || 20;
  if(!Number.isFinite(limit) || limit <= 0) limit = 20;
  limit = Math.min(limit, 200); // cap to avoid heavy responses
  return { page, limit };
}

// --- Routes ---

// GET /api/books (DB mode uses Mongo, otherwise file cache)
app.get('/api/books', async (req, res) => {
  try{
    const { page, limit } = parsePagination(req.query);
    const { minPrice, maxPrice, rating, inStock, search } = req.query;

    if(MONGO_URI && Book){
      const q = {};
      if(minPrice || maxPrice){ q.price = {}; if(minPrice) q.price.$gte = Number(minPrice); if(maxPrice) q.price.$lte = Number(maxPrice); }
      if(rating) q.rating = { $gte: Number(rating) };
      if(inStock !== undefined) q.inStock = (inStock === 'true');
      let mongoQuery = Book.find(q);
      if(search){ mongoQuery = Book.find({ $text: { $search: String(search) }, ...q }); }
      const skip = (page - 1) * limit;
      const items = await mongoQuery.skip(skip).limit(limit);
      const total = await Book.countDocuments(search ? { $text: { $search: String(search) }, ...q } : q);
      res.json({ total, page, limit, items });
    }else{
      // file-mode filtering
      let results = booksCache.slice();
      if(minPrice) results = results.filter(b => Number(b.price) >= Number(minPrice));
      if(maxPrice) results = results.filter(b => Number(b.price) <= Number(maxPrice));
      if(rating) results = results.filter(b => Number(b.rating) >= Number(rating));
      if(inStock !== undefined) results = results.filter(b => (!!b.inStock) === (inStock === 'true'));
      if(search) results = results.filter(b => (b.title || '').toLowerCase().includes(String(search).toLowerCase()));
      const total = results.length;
      const skip = (page - 1) * limit;
      const paged = results.slice(skip, skip + limit);
      res.json({ total, page, limit, items: paged });
    }
  }catch(e){
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/books/:id
app.get('/api/books/:id', async (req, res) => {
  try{
    const id = req.params.id;
    if(MONGO_URI && Book){
      const book = await Book.findById(id);
      if(!book) return res.status(404).json({ error: 'Not found' });
      return res.json(book);
    }else{
      const book = booksCache.find(b => String(b._id) === String(id));
      if(!book) return res.status(404).json({ error: 'Not found' });
      return res.json(book);
    }
  }catch(e){
    res.status(500).json({ error: e.message });
  }
});

// POST /api/refresh - run scraper script and reload JSON (optionally import into Mongo)
app.post('/api/refresh', (req, res) => {
  // optional protection
  if(REFRESH_TOKEN){
    const token = req.headers['x-refresh-token'] || req.body.token;
    if(token !== REFRESH_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  }

  if(!fs.existsSync(SCRAPER_PATH)) return res.status(400).json({ error: 'Scraper script not found at ' + SCRAPER_PATH });
  const node = process.execPath;
  const child = spawn(node, [SCRAPER_PATH], { cwd: path.dirname(SCRAPER_PATH) });
  let out = '';
  child.stdout.on('data', d => out += d.toString());
  child.stderr.on('data', d => out += d.toString());
  child.on('error', err => {
    console.error('Failed to start scraper:', err.message);
  });
  child.on('close', async (code) => {
    try{
      await loadBooks({ importToDb: Boolean(MONGO_URI) });
    }catch(e){
      console.warn('loadBooks after scraper failed:', e.message);
    }
    res.json({ ok: true, code, output: out.slice(0, 2000) });
  });
});

// health
app.get('/health', (req, res)=> res.json({ ok:true }));

app.listen(PORT, ()=> console.log('Backend running on', PORT));


// File: models/Book.js
// Mongoose schema and model for books. Keep fields flexible to match scraped JSON.
const mongoose2 = require('mongoose');
const { Schema } = mongoose2;

const BookSchema = new Schema({
  title: { type: String, required: true },
  author: { type: String },
  price: { type: Number },
  rating: { type: Number },
  inStock: { type: Boolean },
  description: { type: String },
  url: { type: String },
  image: { type: String },
  // accept any additional fields from scraped JSON
}, { strict: false, timestamps: true });

// text index for search (create in DB once)
BookSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose2.models.Book || mongoose2.model('Book', BookSchema);
