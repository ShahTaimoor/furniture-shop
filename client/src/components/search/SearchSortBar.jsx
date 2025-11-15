import { ChevronDown } from 'lucide-react';

const sortOptions = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'latest', label: 'Latest arrivals' },
  { value: 'featured', label: 'Featured' },
];

const SearchSortBar = ({ sort, onSortChange, pagination, appliedFilters = 0, onFilterToggle }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
    <div>
      <p className="text-sm font-semibold text-gray-900">
        {pagination?.total || 0} products
        {pagination?.page && pagination?.pages
          ? ` • Page ${pagination.page} of ${pagination.pages}`
          : ''}
      </p>
      {appliedFilters > 0 && (
        <p className="text-xs text-gray-500">{appliedFilters} active filters</p>
      )}
    </div>
    <div className="flex items-center gap-3">
      {onFilterToggle && (
        <button
          type="button"
          onClick={onFilterToggle}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-700 transition hover:border-primary hover:text-primary lg:hidden"
        >
          Filters
          {appliedFilters > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-white">
              {appliedFilters}
            </span>
          )}
        </button>
      )}
      <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Sort by
        <span className="relative">
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value)}
            className="appearance-none rounded-full border border-gray-200 bg-white px-4 py-2 pr-8 text-sm font-medium text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </span>
      </label>
    </div>
  </div>
);

export default SearchSortBar;

