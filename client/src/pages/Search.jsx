import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ShopifySearchBar from '@/components/search/ShopifySearchBar';
import SearchFilters from '@/components/search/SearchFilters';
import SearchResultsGrid from '@/components/search/SearchResultsGrid';
import SearchSortBar from '@/components/search/SearchSortBar';
import SearchSummary from '@/components/search/SearchSummary';
import { useShopifySearch } from '@/hooks/useShopifySearch';
import SEO from '@/components/seo/SEO';

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const search = useShopifySearch({
    query: initialQuery,
    limit: 24,
  });

  const {
    query,
    setQuery,
    results,
    pagination,
    filters,
    availableFilters,
    loading,
    error,
    sort,
    setSort,
    page,
    setPage,
    toggleFilter,
    setPriceRange,
    clearAllFilters,
    appliedFiltersCount,
  } = search;

  useEffect(() => {
    if (initialQuery && initialQuery !== query) {
      setQuery(initialQuery);
    }
  }, [initialQuery, query, setQuery]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (page > 1) params.set('page', String(page));
    if (sort && sort !== 'relevance') params.set('sort', sort);
    setSearchParams(params, { replace: true });
  }, [query, page, sort, setSearchParams]);

  const handleSubmit = (term) => {
    setQuery(term);
    setPage(1);
    setSearchParams({ q: term });
  };

  const handleRemoveFilter = (key, value) => {
    if (key === 'price') {
      if (value === 'min') {
        setPriceRange({ min: null, max: filters.price?.max ?? null });
      } else {
        setPriceRange({ min: filters.price?.min ?? null, max: null });
      }
      return;
    }
    toggleFilter(key, value);
  };

  const paginationControls = useMemo(() => {
    const controls = [];
    if (page > 1) {
      controls.push({
        label: 'Previous',
        onClick: () => setPage(page - 1),
      });
    }
    if (pagination?.hasMore) {
      controls.push({
        label: 'Next',
        onClick: () => setPage(page + 1),
      });
    }
    return controls;
  }, [page, pagination, setPage]);

  const seoKeywords = useMemo(() => {
    if (!query) return ['HELLAS search', 'find furniture'];
    return ['HELLAS search', query, `${query} furniture`];
  }, [query]);

  const seoDescription = query
    ? `Search results for "${query}" across the HELLAS furniture and lifestyle catalogue.`
    : 'Search the entire HELLAS catalogue for furniture, decor, and lifestyle essentials.';

  return (
    <>
      <SEO
        title={query ? `Search: ${query}` : 'Search the HELLAS Store'}
        description={seoDescription}
        keywords={seoKeywords}
        openGraph={{ type: 'website' }}
      />
      <div className="bg-gray-50 py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 lg:flex-row">
          <div className={`w-full transition lg:w-72 ${showMobileFilters ? 'block' : 'hidden lg:block'}`}>
            <SearchFilters
              filters={filters}
              availableFilters={availableFilters}
              onToggle={toggleFilter}
              onPriceChange={setPriceRange}
              onClearAll={() => {
                clearAllFilters();
                setShowMobileFilters(false);
              }}
            />
          </div>
          <main className="flex-1 space-y-4">
            <ShopifySearchBar initialValue={query} onSubmit={handleSubmit} />
            <SearchSummary
              query={query}
              filters={filters}
              availableFilters={availableFilters}
              onRemoveFilter={handleRemoveFilter}
              onClearAll={clearAllFilters}
            />
            <SearchSortBar
              sort={sort}
              onSortChange={setSort}
              pagination={pagination}
              appliedFilters={appliedFiltersCount}
              onFilterToggle={() => setShowMobileFilters((prev) => !prev)}
            />
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}
            <SearchResultsGrid
              items={results}
              loading={loading}
              query={query}
              onRetry={clearAllFilters}
            />

            {pagination?.pages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                <p className="text-sm text-gray-500">
                  Page {pagination.page} of {pagination.pages}
                </p>
                <div className="flex items-center gap-2">
                  {paginationControls.map((control) => (
                    <button
                      key={control.label}
                      type="button"
                      onClick={control.onClick}
                      className="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-700 transition hover:border-primary hover:text-primary"
                    >
                      {control.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
};

export default SearchPage;

