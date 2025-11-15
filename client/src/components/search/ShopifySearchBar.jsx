import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, Tag } from 'lucide-react';
import { usePredictiveSearch } from '@/hooks/usePredictiveSearch';

const SectionHeader = ({ title }) => (
  <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</p>
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

  const handleSubmit = useCallback(
    (term) => {
      const queryValue = (term || value || '').trim();
      if (!queryValue) return;
      if (onSubmit) {
        onSubmit(queryValue);
      } else {
        navigate(`/search?q=${encodeURIComponent(queryValue)}`);
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
      navigate(`/product/${product.slug}`);
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
    if (!showDropdown) return undefined;
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

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
          className="w-full rounded-full border border-gray-200 bg-white py-3 pl-11 pr-12 text-sm text-gray-900 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {loading ? (
          <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
        ) : (
          value && (
            <button
              type="button"
              onClick={() => {
                setValue('');
                setQuery('');
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-wide text-primary"
            >
              Clear
            </button>
          )
        )}
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-14 z-40 w-full rounded-2xl border border-gray-200 bg-white shadow-2xl">
          <div className="max-h-[420px] overflow-y-auto py-2">
            {suggestions.products.length > 0 && (
              <div className="px-2 pb-2">
                <SectionHeader title="Products" />
                <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-gray-50/40">
                  {suggestions.products.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleProductSelect(product)}
                      className="flex w-full items-center gap-4 rounded-xl px-3 py-2 text-left transition hover:bg-white"
                    >
                      <img
                        src={
                          product.image ||
                          'https://images.unsplash.com/photo-1467043153537-a4f570958f30?w=80&h=80&fit=crop'
                        }
                        alt={product.title}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <p className="line-clamp-1 text-sm font-medium text-gray-900">{product.title}</p>
                        <p className="text-xs text-gray-500">
                          {product.brand ? `${product.brand} • ` : ''}
                          {product.salePrice ? (
                            <>
                              <span className="font-semibold text-primary">Rs {product.salePrice}</span>
                              <span className="ml-1 text-gray-400 line-through">Rs {product.price}</span>
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
                      className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{category.name}</p>
                        <p className="text-xs text-gray-500">View collection</p>
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
                        className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 transition hover:border-primary hover:bg-primary/5"
                      >
                        <Tag className="h-3.5 w-3.5 text-primary" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {!loading && value.trim().length >= 1 && suggestions.products.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
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

