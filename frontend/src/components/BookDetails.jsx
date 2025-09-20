import React, { useEffect, useState, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function BookDetails({ bookId, onClose }) {
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/books/${bookId}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`Failed to load (${res.status})`);
        const data = await res.json();
        if (!mounted) return;
        setBook(data);
      } catch (e) {
        if (e.name === 'AbortError') return;
        console.error(e);
        if (mounted) setError(e.message || 'Failed to load book');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [bookId]);

  // Close on Escape and return focus to container anchor when closed
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Keep focus inside modal content for better a11y (simple focus trap for keyboard users)
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const focusable = node.querySelectorAll('a,button,input,textarea,select,[tabindex]:not([tabindex="-1"])');
    if (focusable.length) focusable[0].focus();
  }, [loading, book]);

  if (loading) return (
    <div className="w-full p-8 flex items-center justify-center">
      <div className="animate-pulse w-full max-w-4xl bg-white rounded-2xl p-6 shadow-md">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="w-full sm:w-48 h-64 bg-gray-200 rounded-lg" />
          <div className="flex-1 space-y-4 py-1">
            <div className="h-6 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            <div className="h-32 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="w-full p-8 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-6 shadow-md max-w-2xl w-full text-center">
        <p className="text-red-600 font-medium">{error}</p>
        <div className="mt-4 flex justify-center">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200">Close</button>
        </div>
      </div>
    </div>
  );

  if (!book) return (
    <div className="w-full p-8 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-6 shadow-md max-w-2xl w-full text-center">
        <p className="text-gray-700">Book not found</p>
        <div className="mt-4 flex justify-center">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200">Close</button>
        </div>
      </div>
    </div>
  );

  // Helpful fallbacks
  const title = book.title || book.name || 'Untitled';
  const authors = book.authors || book.author || book.writer || [];
  const isInStock = typeof book.inStock === 'boolean' ? book.inStock : (book.availabilityText ? /in stock/i.test(book.availabilityText) : true);
  const price = typeof book.price === 'number' ? book.price.toFixed(2) : book.price;
  const rating = typeof book.rating === 'number' ? Math.max(0, Math.min(5, book.rating)) : null;

  return (
    <div ref={containerRef} className="w-full p-6 sm:p-8">
      <div className="relative max-w-4xl mx-auto">
        {/* Close button */}
        <button
          aria-label="Close details"
          onClick={onClose}
          className="absolute right-2 top-2 md:right-4 md:top-4 text-gray-500 hover:text-gray-800 bg-white/60 backdrop-blur-sm p-2 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden divide-y md:divide-y-0 md:flex md:gap-6">
          {/* Left: Cover */}
          <div className="md:w-48 flex-shrink-0 bg-gradient-to-br from-gray-50 to-white p-4 flex items-center justify-center">
            <img
              src={book.thumbnail || book.image || ''}
              alt={title}
              className="w-full h-64 md:h-80 object-cover rounded-lg shadow-inner border"
              onError={(e) => { e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="20">No Image</text></svg>'; }}
            />
          </div>

          {/* Right: Info */}
          <div className="p-6 flex-1">
            <h2 id="book-details-title" className="text-2xl font-semibold text-gray-900 leading-tight">{title}</h2>
            {authors && (Array.isArray(authors) ? authors.join(', ') : authors) ? (
              <p className="text-sm text-gray-600 mt-1">By {Array.isArray(authors) ? authors.join(', ') : authors}</p>
            ) : null}

            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Price badge */}
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-50 border border-gray-100">
                  <span className={`text-lg font-semibold ${isInStock ? 'text-green-700' : 'text-red-600'}`}>₹{price ?? 'N/A'}</span>
                </div>

                {/* Rating */}
                {rating !== null && (
                  <div className="flex items-center gap-1 text-sm text-yellow-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg key={i} xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${i < Math.round(rating) ? 'text-yellow-400' : 'text-gray-300'}`} viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.956a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.286-3.957a1 1 0 00-.364-1.118L2.063 9.383c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.956z" />
                      </svg>
                    ))}
                    <span className="ml-2 text-sm text-gray-600">{rating.toFixed(1)}</span>
                  </div>
                )}

                {/* Stock */}
                <div className={`ml-2 text-sm font-medium px-2 py-1 rounded-md ${isInStock ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {isInStock ? 'In stock' : 'Out of stock'}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {book.detailUrl && (
                  <a
                    href={book.detailUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    Open source
                  </a>
                )}

                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-gray-100 text-sm font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-200"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="mt-6 text-sm text-gray-700 max-h-[40vh] overflow-y-auto prose prose-sm">
              <p>{book.description || book.shortDescription || 'No description available.'}</p>

              {/* Extra metadata */}
              <div className="mt-4 text-xs text-gray-500 space-y-1">
                {book.publisher && <div><strong>Publisher:</strong> {book.publisher}</div>}
                {book.publishedDate && <div><strong>Published:</strong> {book.publishedDate}</div>}
                {book.pageCount && <div><strong>Pages:</strong> {book.pageCount}</div>}
                {book.categories && <div><strong>Categories:</strong> {Array.isArray(book.categories) ? book.categories.join(', ') : book.categories}</div>}
              </div>
            </div>

            {/* Footer actions (mobile) */}
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <a
                href={book.buyLink || book.detailUrl || '#'}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-4 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              >
                Buy now
              </a>

              <button onClick={onClose} className="w-full sm:w-auto px-4 py-3 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
