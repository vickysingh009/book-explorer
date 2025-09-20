require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const mongoose = require('mongoose');
const path = require('path');

const BASE = 'https://books.toscrape.com/';

const ratingMap = { 'One':1,'Two':2,'Three':3,'Four':4,'Five':5 };

async function delay(ms){ return new Promise(res=>setTimeout(res, ms)); }

async function scrapeAll(){
  let url = BASE;
  const books = [];
  while(url){
    console.log('Fetching:', url);
    try{
      const {data} = await axios.get(url);
      const $ = cheerio.load(data);
      $('.product_pod').each((i, el) => {
        const title = $(el).find('h3 a').attr('title')?.trim() || '';
        const priceText = $(el).find('.price_color').text().trim();
        const price = parseFloat(priceText.replace(/[^0-9.]/g,'')) || 0;
        const availabilityText = $(el).find('.availability').text().replace(/\s+/g,' ').trim();
        const inStock = /In stock/i.test(availabilityText);
        const ratingClass = $(el).find('.star-rating').attr('class') || '';
        const ratingWord = ratingClass.split(' ').filter(s=>s!=='star-rating')[0] || '';
        const rating = ratingMap[ratingWord] || 0;
        const href = $(el).find('h3 a').attr('href') || '';
        const detailUrl = new URL(href, url).href;
        const thumb = $(el).find('.image_container img').attr('src') || '';
        const thumbnail = new URL(thumb, url).href;
        books.push({ title, price, inStock, availabilityText, rating, detailUrl, thumbnail });
      });

      const nextHref = $('li.next a').attr('href');
      if(nextHref) url = new URL(nextHref, url).href;
      else url = null;
      await delay(300);
    }catch(err){
      console.error('Error fetching', url, err.message);
      break;
    }
  }
  return books;
}

async function saveToJSON(books){
  const out = path.join(__dirname,'books.json');
  fs.writeFileSync(out, JSON.stringify(books, null, 2), 'utf8');
  console.log('Saved', books.length, 'books to', out);
}

async function saveToMongo(books){
  const uri = process.env.MONGO_URI;
  const dbName = process.env.MONGO_DB || 'bookexplorer';
  if(!uri){
    console.warn('MONGO_URI not set. Skipping Mongo save.');
    return;
  }
  await mongoose.connect(uri, { dbName, useNewUrlParser:true, useUnifiedTopology:true });
  const BookSchema = new mongoose.Schema({
    title: String,
    price: Number,
    inStock: Boolean,
    availabilityText: String,
    rating: Number,
    detailUrl: { type: String, unique: true },
    thumbnail: String
  }, { timestamps:true });
  BookSchema.index({ title: 'text' });
  const Book = mongoose.model('Book', BookSchema);
  let ops = 0;
  for(const b of books){
    try{
      await Book.updateOne({ detailUrl: b.detailUrl }, { $set: b }, { upsert:true });
      ops++;
    }catch(e){
      console.error('Mongo upsert failed for', b.detailUrl, e.message);
    }
  }
  console.log('Upserted/updated', ops, 'books into MongoDB');
  await mongoose.disconnect();
}

(async ()=>{
  const books = await scrapeAll();
  await saveToJSON(books);
  if(process.env.MONGO_URI){
    await saveToMongo(books);
  }
  console.log('Done.');
})();
