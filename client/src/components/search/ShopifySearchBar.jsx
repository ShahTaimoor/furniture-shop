import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Tag } from 'lucide-react';
import { usePredictiveSearch } from '@/hooks/usePredictiveSearch';

const SectionHeader = ({ title }) => (
  <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-mocha/60">{title}</p>
);

const SearchSkeleton = () => (
  <div className="px-2 py-2" aria-hidden="true">
    <div className="px-3 pb-2">
      <div className="skeleton-warm h-3 w-20 rounded" />
    </div>
    <div className="space-y-2 rounded-xl border border-latte bg-latte-soft/40 p-1.5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl px-3 py-2">
          <div className="skeleton-warm h-12 w-12 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="skeleton-warm h-3.5 w-3/5 rounded" />
            <div className="skeleton-warm h-3 w-2/5 rounded" />
          </div>
        </div>
      ))}
    </div>
    <div className="px-3 pt-3 pb-1">
      <div className="skeleton-warm h-3 w-24 rounded" />
    </div>
    <div className="space-y-2 px-1">
      {[0, 1].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-latte px-3 py-2.5">
          <div className="skeleton-warm h-4 w-4 shrink-0 rounded" />
          <div className="flex-1 space-y-2">
            <div className="skeleton-warm h-3.5 w-1/3 rounded" />
            <div className="skeleton-warm h-3 w-1/4 rounded" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ShopifySearchBar = ({
  initialValue = '',
  placeholder = 'Search products, brands, collections…',
  onSubmit,
  className = '',
  autoFocus = false,
}) => {
  const navigate = useNavigate();
  const [value, setValue] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const {
    suggestions,
    loading,
    error,
    keywordFallbacks,
    setQuery,
  } = usePredictiveSearch();

  useEffect(() => {
    setValue(initialValue);
    setQuery(initialValue);
  }, [initialValue, setQuery]);

  const showDropdown = isFocused && (value.trim().length > 0 || suggestions.products.length > 0);

  // Only surface the spinner on the very first fetch for a term (nothing to show
  // yet). Once we have results, keep them on screen and refresh silently so the
  // loader doesn't flash on every keystroke.
  const hasResults =
    suggestions.products.length > 0 ||
    suggestions.categories.length > 0 ||
    suggestions.tags.length > 0;
  // Show the skeleton inside the dropdown on the first fetch for a term; keep old
  // results visible on later keystrokes so nothing flashes.
  const showSkeleton = loading && !hasResults && value.trim().length > 0;

  const handleSubmit = useCallback(
    (term) => {
      const queryValue = (term || value || '').trim();
      if (!queryValue) return;
      if (onSubmit) {
        onSubmit(queryValue);
      } else {
        navigate(`/search?query=${encodeURIComponent(queryValue)}`);
      }
      setIsFocused(false);
      setValue('');
      setQuery('');
    },
    [navigate, onSubmit, value, setQuery]
  );

  const handleProductSelect = useCallback(
    (product) => {
      setIsFocused(false);
      setValue('');
      setQuery('');
      // Navigate to Search Results page using the product title as the query
      const term = product?.title || '';
      if (term) {
        navigate(`/search?query=${encodeURIComponent(term)}`);
      }
    },
    [navigate, setQuery]
  );

  const handleCategorySelect = useCallback(
    (category) => {
      setIsFocused(false);
      setValue('');
      setQuery('');
      navigate(`/category/${category.slug}`);
    },
    [navigate, setQuery]
  );

  const handleTagSelect = useCallback(
    (tag) => {
      handleSubmit(tag.name);
    },
    [handleSubmit]
  );

  const handleChange = useCallback(
    (event) => {
      const nextValue = event.target.value;
      setValue(nextValue);
      setQuery(nextValue);
    },
    [setQuery]
  );

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleSubmit();
      } else if (event.key === 'Escape') {
        setIsFocused(false);
        inputRef.current?.blur();
      }
    },
    [handleSubmit]
  );

  useEffect(() => {
    if (!isFocused) return undefined;
    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsFocused(false);
        inputRef.current?.blur();
      }
    };
    // capture phase so a child's stopPropagation can't swallow it
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('touchstart', handlePointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('touchstart', handlePointerDown, true);
    };
  }, [isFocused]);

  const fallbackKeywords = useMemo(() => {
    if (value.trim().length >= 2) return [];
    return keywordFallbacks;
  }, [value, keywordFallbacks]);

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full rounded-full border border-latte bg-card py-3 pl-11 pr-12 text-sm text-espresso shadow-sm transition-[border-color,box-shadow] duration-200 focus:border-caramel focus:outline-none focus:ring-2 focus:ring-caramel/25"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              setValue('');
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-wide text-caramel-deep transition-colors hover:text-espresso"
          >
            Clear
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-14 z-40 w-full rounded-2xl border border-latte bg-popover shadow-[0_24px_60px_-15px_rgba(43,29,23,0.35)] animate-scale-in origin-top">
          <div className="max-h-[420px] overflow-y-auto py-2">
            {showSkeleton && <SearchSkeleton />}

            {suggestions.products.length > 0 && (
              <div className="px-2 pb-2">
                <SectionHeader title="Products" />
                <div className="divide-y divide-latte rounded-xl border border-latte bg-latte-soft/40">
                  {suggestions.products.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleProductSelect(product)}
                      className="flex w-full items-center gap-4 rounded-xl px-3 py-2 text-left transition-colors duration-200 hover:bg-card"
                    >
                      <img
                        src={
                          product.image ||
                          'https://images.unsplash.com/photo-1467043153537-a4f570958f30?w=80&h=80&fit=crop'
                        }
                        alt={product.title}
                        className="h-12 w-12 rounded-lg object-cover border border-latte bg-card"
                      />
                      <div className="flex-1">
                        <p className="line-clamp-1 text-sm font-medium text-espresso">{product.title}</p>
                        <p className="text-xs text-mocha">
                          {product.brand ? `${product.brand} • ` : ''}
                          {product.salePrice ? (
                            <>
                              <span className="font-semibold text-caramel-deep">Rs {product.salePrice}</span>
                              <span className="ml-1 text-mocha/50 line-through">Rs {product.price}</span>
                            </>
                          ) : (
                            <span>Rs {product.price}</span>
                          )}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {suggestions.categories.length > 0 && (
              <div className="px-2 pb-2">
                <SectionHeader title="Collections" />
                <div className="grid gap-2">
                  {suggestions.categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleCategorySelect(category)}
                      className="flex items-center gap-3 rounded-xl border border-latte px-3 py-2.5 text-left text-sm font-medium text-mocha transition-colors duration-200 hover:bg-latte-soft hover:border-caramel/50"
                    >
                      <Tag className="h-4 w-4 shrink-0 text-caramel-deep" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-espresso">{category.name}</p>
                        <p className="text-xs text-mocha/70">View collection</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(suggestions.tags.length > 0 || fallbackKeywords.length > 0) && (
              <div className="px-2 pb-1">
                <SectionHeader title="Popular searches" />
                <div className="flex flex-wrap gap-2 px-1 pb-2">
                  {(suggestions.tags.length > 0 ? suggestions.tags : fallbackKeywords).map((tag) => {
                    const label = typeof tag === 'string' ? tag : tag.name;
                    const identifier = typeof tag === 'string' ? tag : tag.id;
                    return (
                      <button
                        key={identifier}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleTagSelect(typeof tag === 'string' ? { name: tag } : tag)}
                        className="inline-flex items-center gap-2 rounded-full border border-latte px-3 py-1 text-xs font-medium text-mocha transition-colors duration-200 hover:border-caramel hover:bg-caramel/10 hover:text-espresso"
                      >
                        <Tag className="h-3.5 w-3.5 text-caramel-deep" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {!loading && value.trim().length >= 1 && suggestions.products.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-mocha">
                No exact matches found. Press enter to search for “{value}”.
              </div>
            )}

            {error && (
              <p className="px-4 pb-2 text-xs text-red-500">
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopifySearchBar;

