import React from 'react';

export default function BookCard({ book, onClick }) {
  const { title, price, thumbnail, rating, inStock } = book;
  return (
    <div onClick={onClick} style={{
      cursor: 'pointer',
      border: '1px solid #eee',
      borderRadius: 8,
      padding: 8,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      minHeight: 260,
      background: '#fff'
    }}>
      <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <img src={thumbnail} alt={title} style={{ maxWidth: '100%', maxHeight: '100%' }} />
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 13 }}>Price: ₹{price?.toFixed ? price.toFixed(2) : price}</div>
        <div style={{ fontSize: 13 }}>Rating: {rating || '—'}</div>
        <div style={{ fontSize: 12, color: inStock ? 'green' : '#b00' }}>{inStock ? 'In stock' : 'Out of stock'}</div>
      </div>
    </div>
  );
}
