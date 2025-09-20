Scraper
-------
Run from `/scraper`:

1. `npm install`
2. `node scraper.js`

Output:
- `books.json` will be created inside `/scraper`.
- If `MONGO_URI` set in `.env`, the script will also upsert into MongoDB.
