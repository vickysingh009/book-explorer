import React from 'react';

export default function Filters({
  search, setSearch,
  rating, setRating,
  inStock, setInStock,
  minPrice, setMinPrice,
  maxPrice, setMaxPrice
}) {
  return (
    <div style={{
      display: 'flex',
      gap: 12,
      flexWrap: 'wrap',
      alignItems: 'center',
      marginTop: 8
    }}>
      <input
        placeholder="Search by title..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ padding: 8, minWidth: 220 }}
      />

      <select value={rating} onChange={e => setRating(e.target.value)}>
        <option value="">Any rating</option>
        <option value="5">5 stars</option>
        <option value="4">4+ stars</option>
        <option value="3">3+ stars</option>
        <option value="2">2+ stars</option>
        <option value="1">1+ stars</option>
      </select>

      <select value={inStock} onChange={e => setInStock(e.target.value)}>
        <option value="">Any stock</option>
        <option value="true">In stock</option>
        <option value="false">Out of stock</option>
      </select>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input type="number" placeholder="Min price" value={minPrice} onChange={e => setMinPrice(e.target.value)} style={{ width: 100, padding: 6 }} />
        <input type="number" placeholder="Max price" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} style={{ width: 100, padding: 6 }} />
      </div>

      <button onClick={() => { setSearch(''); setRating(''); setInStock(''); setMinPrice(''); setMaxPrice(''); }}>
        Clear
      </button>
    </div>
  );
}
