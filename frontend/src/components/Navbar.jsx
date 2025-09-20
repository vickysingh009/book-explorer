import React, { useState, useEffect, useRef } from 'react';

// --- HELPER HOOKS & ICONS ---
const useDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const toggle = () => setIsOpen(!isOpen);
  const close = () => setIsOpen(false);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  return { isOpen, toggle, close, dropdownRef };
};

// --- ICONS (kept short here; use your full SVGs) ---
const BookIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>);
const SearchIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>);
const MenuIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>);
const ChevronDownIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>);
const StarIcon = ({ filled }) => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={filled ? 'text-yellow-400' : 'text-gray-300'}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>);

/**
 * Navbar — fixed: pass trimmed query into onSearch(trimmed) to avoid stale parent state
 */
export default function Navbar({
  searchQuery = '',
  onSearchQueryChange = () => {},
  filters = { priceRange: [0, 50], rating: null, availability: 'all' },
  onFilterChange = () => {},
  onSearch = () => {}
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const ratingDropdown = useDropdown();
  const availabilityDropdown = useDropdown();
  const priceDropdown = useDropdown();

  // --- NEW: local search state to guarantee the latest typed value on submit ---
  const [searchLocal, setSearchLocal] = useState(searchQuery);

  // Price local state
  const [minPrice, setMinPrice] = useState(filters.priceRange?.[0] ?? 0);
  const [maxPrice, setMaxPrice] = useState(filters.priceRange?.[1] ?? 50);
  const [priceError, setPriceError] = useState('');

  // Keep local copy in sync when parent updates searchQuery externally
  useEffect(() => {
    setSearchLocal(searchQuery ?? '');
  }, [searchQuery]);

  // sync price when parent filters change
  useEffect(() => {
    const pr = filters.priceRange ?? [0, 50];
    setMinPrice(pr[0]);
    setMaxPrice(pr[1]);
  }, [filters.priceRange]);

  // validate price inputs
  useEffect(() => {
    if (Number(minPrice) > Number(maxPrice)) {
      setPriceError('Min must be ≤ Max');
    } else {
      setPriceError('');
    }
  }, [minPrice, maxPrice]);

  // Submit handler: ensure parent gets the trimmed latest value first, then trigger onSearch
  const handleLocalSearch = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const trimmed = (searchLocal ?? '').trim();
    // push latest text up to parent (important: Home reads this before running instant search)
    onSearchQueryChange(trimmed);
    // call the parent's submit handler and pass the trimmed query so Home doesn't rely on stale state
    onSearch(trimmed);
    // close mobile menu if open
    setIsMobileMenuOpen(false);
  };

  // Price handlers
  const handleApplyPrice = () => {
    if (Number(minPrice) > Number(maxPrice)) {
      setPriceError('Min must be ≤ Max');
      return;
    }
    onFilterChange('priceRange', [Number(minPrice), Number(maxPrice)]);
    priceDropdown.close();
  };
  const handleResetPrice = () => {
    const defaultMin = 0;
    const defaultMax = 50;
    setMinPrice(defaultMin);
    setMaxPrice(defaultMax);
    onFilterChange('priceRange', [defaultMin, defaultMax]);
    priceDropdown.close();
  };

  // Optional: handle Enter key directly on the input (safety net)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      // prevent double submit if inside a form — call same handler
      e.preventDefault();
      handleLocalSearch(e);
    }
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0 flex items-center">
            <BookIcon />
            <span className="ml-2 text-xl font-bold text-gray-800">Book Explorer</span>
          </div>

          {/* Desktop search */}
          <div className="hidden md:flex flex-1 justify-center px-8">
            <form onSubmit={handleLocalSearch} className="w-full max-w-lg">
              <div className="relative">
                <input
                  type="search"
                  value={searchLocal}
                  onChange={(e) => {
                    setSearchLocal(e.target.value);
                    // keep parent in sync for debounced typing behavior
                    onSearchQueryChange(e.target.value);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search by title..."
                  className="w-full pl-4 pr-10 py-2 border rounded-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button type="submit" className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-indigo-600" aria-label="Search">
                  <SearchIcon />
                </button>
              </div>
            </form>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-600 hover:text-gray-800 focus:outline-none">
              <MenuIcon />
            </button>
          </div>
        </div>

        {/* --- Filters area (rating / availability / price) --- */}
        <div className="hidden md:flex items-center justify-center space-x-4 py-2 border-t">
          {/* Rating */}
          <div className="relative" ref={ratingDropdown.dropdownRef}>
            <button onClick={ratingDropdown.toggle} className="flex items-center space-x-2 text-gray-600 hover:text-gray-800">
              <span>Rating</span>
              <ChevronDownIcon />
            </button>
            {ratingDropdown.isOpen && (
              <div className="absolute mt-2 w-48 bg-white border rounded-md shadow-lg z-10">
                <a href="#" onClick={(e) => { e.preventDefault(); onFilterChange('rating', null); ratingDropdown.close(); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Any Rating</a>
                {[5,4,3,2,1].map(star => (
                  <a key={star} href="#" onClick={(e) => { e.preventDefault(); onFilterChange('rating', star); ratingDropdown.close(); }} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <span className="flex gap-1">{[...Array(5)].map((_,i) => <StarIcon key={i} filled={i < star} />)}</span>
                    <span className="ml-2">& Up</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Availability */}
          <div className="relative" ref={availabilityDropdown.dropdownRef}>
            <button onClick={availabilityDropdown.toggle} className="flex items-center space-x-2 text-gray-600 hover:text-gray-800">
              <span>Availability</span>
              <ChevronDownIcon />
            </button>
            {availabilityDropdown.isOpen && (
              <div className="absolute mt-2 w-40 bg-white border rounded-md shadow-lg z-10">
                <a href="#" onClick={(e) => { e.preventDefault(); onFilterChange('availability', 'all'); availabilityDropdown.close(); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">All</a>
                <a href="#" onClick={(e) => { e.preventDefault(); onFilterChange('availability', 'in-stock'); availabilityDropdown.close(); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">In Stock</a>
                <a href="#" onClick={(e) => { e.preventDefault(); onFilterChange('availability', 'out-of-stock'); availabilityDropdown.close(); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Out of Stock</a>
              </div>
            )}
          </div>

          {/* Price Range */}
          <div className="relative" ref={priceDropdown.dropdownRef}>
            <button onClick={() => priceDropdown.toggle()} className="flex items-center space-x-2 text-gray-600 hover:text-gray-800">
              <span>Price Range</span>
              <ChevronDownIcon />
            </button>

            {priceDropdown.isOpen && (
              <div className="absolute mt-2 w-64 bg-white border rounded-md shadow-lg z-10 p-4">
                <div className="flex flex-col space-y-2">
                  <label className="text-sm text-gray-600">Min</label>
                  <input
                    type="number"
                    min="0"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-1 border rounded"
                    aria-label="Minimum price"
                  />

                  <label className="text-sm text-gray-600">Max</label>
                  <input
                    type="number"
                    min="0"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-1 border rounded"
                    aria-label="Maximum price"
                  />

                  {priceError && <div className="text-sm text-red-600">{priceError}</div>}

                  <div className="flex items-center justify-between pt-2">
                    <button onClick={handleResetPrice} className="px-3 py-1 text-sm border rounded hover:bg-gray-50">Reset</button>
                    <button disabled={!!priceError} onClick={handleApplyPrice} className={`px-3 py-1 text-sm rounded ${priceError ? 'opacity-50 cursor-not-allowed' : 'bg-indigo-600 text-white'}`}>Apply</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile search + filters */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <form onSubmit={handleLocalSearch} className="mb-4">
              <div className="relative">
                <input
                  type="search"
                  value={searchLocal}
                  onChange={(e) => {
                    setSearchLocal(e.target.value);
                    onSearchQueryChange(e.target.value);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search by title..."
                  className="w-full pl-4 pr-10 py-2 border rounded-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button type="submit" className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-indigo-600" aria-label="Search"><SearchIcon /></button>
              </div>
            </form>

            {/* mobile filters (rating / availability / price) */}
            <div className="space-y-4 px-2">
              {/* Rating mobile */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Rating</label>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => onFilterChange('rating', null)} className="px-3 py-1 border rounded">Any</button>
                  {[5,4,3,2,1].map(star => (
                    <button key={star} onClick={() => onFilterChange('rating', star)} className="px-3 py-1 border rounded flex items-center gap-1">
                      {[...Array(5)].map((_,i) => <StarIcon key={i} filled={i < star} />)}
                      <span className="text-sm">{star}+</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Availability mobile */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Availability</label>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => onFilterChange('availability', 'all')} className="px-3 py-1 border rounded">All</button>
                  <button onClick={() => onFilterChange('availability', 'in-stock')} className="px-3 py-1 border rounded">In Stock</button>
                  <button onClick={() => onFilterChange('availability', 'out-of-stock')} className="px-3 py-1 border rounded">Out</button>
                </div>
              </div>

              {/* Price mobile */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Price Range</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="0"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="px-3 py-2 border rounded"
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    min="0"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="px-3 py-2 border rounded"
                    placeholder="Max"
                  />
                </div>
                {priceError && <div className="text-sm text-red-600 mt-1">{priceError}</div>}
                <div className="flex gap-2 mt-3">
                  <button onClick={handleResetPrice} className="flex-1 px-3 py-2 border rounded">Reset</button>
                  <button onClick={handleApplyPrice} disabled={!!priceError} className={`flex-1 px-3 py-2 rounded ${priceError ? 'opacity-50 cursor-not-allowed' : 'bg-indigo-600 text-white'}`}>Apply</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
