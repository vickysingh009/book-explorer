import React, { useEffect, useState, useCallback } from 'react';
import Navbar from '../components/NavBar';
import BookCard from '../components/BookCard';
import BookDetails from '../components/BookDetails';

// --- HELPER HOOK ---
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// --- UI Components (same as before) ---
const IconChevronLeft = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);
const IconChevronRight = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);
const LoadingSpinner = () => (
  <div className="flex justify-center items-center p-8 col-span-full">
    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);
const EmptyState = ({ isSearch }) => (
  <div className="col-span-full text-center py-12 bg-white rounded-lg shadow-sm">
    <h3 className="text-xl font-semibold text-gray-700">{isSearch ? "No Books Match Your Criteria" : "No Books Found"}</h3>
    <p className="text-gray-500 mt-2">{isSearch ? "Try adjusting your search or filters." : "There are currently no books to display."}</p>
  </div>
);

// --- API Configuration ---
const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export default function Home() {
  const [books, setBooks] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(16);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [instantSearchQuery, setInstantSearchQuery] = useState(null); // immediate query on submit
  const [filters, setFilters] = useState({
    priceRange: [0, 50],
    rating: null,
    availability: 'all',
  });

  // Debounced values for typing
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const debouncedFilters = useDebounce(filters, 300);

  // normalize and set filters
  const handleFilterChange = (filterName, value) => {
    setPage(1);
    let processedValue = value;
    if (filterName === 'rating') {
      if (value === null || value === '' || value === undefined) processedValue = null;
      else {
        const p = parseInt(value, 10);
        processedValue = Number.isNaN(p) ? null : p;
      }
    } else if (filterName === 'priceRange') {
      const minRaw = Array.isArray(value) ? value[0] : (value && value.min) || 0;
      const maxRaw = Array.isArray(value) ? value[1] : (value && value.max) || minRaw || 50;
      const min = Number.isNaN(Number(minRaw)) ? 0 : Math.max(0, Number(minRaw));
      let max = Number.isNaN(Number(maxRaw)) ? Math.max(50, min) : Number(maxRaw);
      if (max < min) max = min;
      processedValue = [min, max];
    } else if (filterName === 'availability') {
      processedValue = (!value && value !== '') ? 'all' : String(value);
    }
    setFilters(prev => ({ ...prev, [filterName]: processedValue }));
  };

  // --- FIXED: accept optional `query` param so Navbar can pass trimmed text directly ---
  const handleSearch = (query) => {
    // user pressed search (submit) -> run immediate search with given query (or current state)
    setPage(1);

    // prefer explicit query param passed from Navbar; otherwise use current searchQuery state
    const q = (typeof query === 'string') ? query : searchQuery;
    console.log('[Home] handleSearch received query:', q);
    // keep the parent searchQuery state in sync so UI shows the submitted value
    setSearchQuery(q);
    setInstantSearchQuery(q === '' ? null : q);
  };

  // helper alias appender (keeps buildQuery compact)
  const appendWithAliases = (params, value, aliases = []) => aliases.forEach(a => params.append(a, value));

  // buildQuery: prefer instantSearchQuery when present (submit); otherwise use debouncedSearchQuery
  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));

    const queryText = (instantSearchQuery !== null && instantSearchQuery !== undefined) ? instantSearchQuery : debouncedSearchQuery;
    console.log('[Home] buildQuery - chosen queryText:', queryText);

    // Add query param under several common names in case backend expects a different key
    if (queryText) {
      appendWithAliases(params, String(queryText), ['q', 'title', 'search']);
    }

    // rating
    if (debouncedFilters.rating !== null && debouncedFilters.rating !== undefined) {
      const v = String(debouncedFilters.rating);
      appendWithAliases(params, v, ['rating_gte', 'min_rating', 'rating']);
    }

    // availability
    if (debouncedFilters.availability && debouncedFilters.availability !== 'all') {
      const v = String(debouncedFilters.availability);
      appendWithAliases(params, v, ['status', 'availability', 'stock_status', 'in_stock']);
      if (v === 'in-stock' || v === 'in_stock' || v === 'instock') {
        params.append('available', 'true');
        params.append('inStock', 'true');
      } else if (v === 'out-of-stock' || v === 'out_of_stock' || v === 'outofstock') {
        params.append('available', 'false');
        params.append('inStock', 'false');
      }
    }

    // price bounds
    if (debouncedFilters.priceRange && Array.isArray(debouncedFilters.priceRange)) {
      const minNum = Number.isNaN(Number(debouncedFilters.priceRange[0])) ? 0 : Number(debouncedFilters.priceRange[0]);
      const maxCandidate = Number.isNaN(Number(debouncedFilters.priceRange[1])) ? Math.max(50, minNum) : Number(debouncedFilters.priceRange[1]);
      const maxNum = Math.max(minNum, maxCandidate);
      const minS = String(minNum), maxS = String(maxNum);
      appendWithAliases(params, minS, ['price_gte', 'min_price', 'price_min', 'minPrice']);
      appendWithAliases(params, maxS, ['price_lte', 'max_price', 'price_max', 'maxPrice']);
      params.append('price_from', minS);
      params.append('price_to', maxS);
    }

    const qs = params.toString();
    console.log('[Home] buildQuery -> final query string:', qs);
    return qs;
  }, [page, limit, debouncedSearchQuery, debouncedFilters, instantSearchQuery]);

  // fetch effect — depends on buildQuery. We clear instantSearchQuery after fetch to resume debounced behavior.
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchBooks = async () => {
      setLoading(true);
      try {
        const q = buildQuery();
        console.log('[Home] Fetching with query:', q);
        const url = `${API_BASE}/api/books?${q}`;
        console.log('[Home] Fetch URL:', url);
        const res = await fetch(url, { signal });
        if (!res.ok) {
          console.error('[Home] API returned non-OK status', res.status);
          setBooks([]);
          setTotal(0);
          return;
        }
        const data = await res.json();
        console.log('[Home] API response JSON:', data);

        // support multiple shapes: items, books, results
        const items = data.items || data.books || data.results || [];
        setBooks(items);
        // support multiple total-count keys
        const t = data.total ?? data.count ?? data.totalItems ?? (Array.isArray(items) ? items.length : 0);
        setTotal(t);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('[Home] fetchBooks err', err);
          setBooks([]);
          setTotal(0);
        }
      } finally {
        setLoading(false);
        // clear instantSearchQuery so subsequent changes are debounced again
        if (instantSearchQuery) {
          // delay clearing one tick so buildQuery won't see it in the same render (optional)
          setInstantSearchQuery(null);
        }
      }
    };

    fetchBooks();
    return () => controller.abort();
  }, [buildQuery, instantSearchQuery]); // include instantSearchQuery for immediate runs

  // keep modal scroll lock behavior
  useEffect(() => {
    document.body.style.overflow = selected ? 'hidden' : 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [selected]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const startItem = total > 0 ? (page - 1) * limit + 1 : 0;
  const endItem = Math.min(page * limit, total);
  const isFiltered = Boolean(instantSearchQuery ?? debouncedSearchQuery) || Boolean(debouncedFilters.rating) || (debouncedFilters.availability && debouncedFilters.availability !== 'all');

  return (
    <>
      <Navbar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        filters={filters}
        onFilterChange={handleFilterChange}
        onSearch={handleSearch}   // now accepts optional query param
      />
      <div className="bg-gray-100 min-h-screen">
        <div className={`max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12 transition-all duration-300 ${selected ? 'blur-sm pointer-events-none' : ''}`} aria-hidden={!!selected}>
          <main>
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Explore Our Collection</h1>
                <p className="text-sm text-gray-500 mt-1">Find your next favorite read from our curated list.</p>
              </div>
              <div className="text-sm font-medium text-gray-600 whitespace-nowrap">{total > 0 && `Showing ${startItem}-${endItem} of ${total} results`}</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {loading ? <LoadingSpinner /> : books.length > 0 ? (
                books.map(b => (
                  <div key={b._id || b.detailUrl || b.id} className="bg-white rounded-lg shadow-sm overflow-hidden transform hover:-translate-y-1 transition-all duration-300">
                    <BookCard book={b} onClick={() => setSelected(b)} />
                  </div>
                ))
              ) : <EmptyState isSearch={isFiltered} />}
            </div>

            {!loading && total > limit && (
              <nav className="mt-8 flex justify-center items-center gap-4" aria-label="Pagination">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center justify-center px-3 h-9 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                  <IconChevronLeft /><span className="ml-2 hidden sm:inline">Previous</span>
                </button>
                <div className="text-sm font-semibold text-gray-700">Page {page} of {totalPages}</div>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex items-center justify-center px-3 h-9 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                  <span className="mr-2 hidden sm:inline">Next</span><IconChevronRight />
                </button>
              </nav>
            )}
          </main>
        </div>

        {selected && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setSelected(null)} role="dialog" aria-modal="true">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <BookDetails bookId={selected._id || selected.detailUrl || selected.id} onClose={() => setSelected(null)} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
