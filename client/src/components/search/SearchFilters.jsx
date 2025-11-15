import { useMemo, useState } from 'react';
import { Filter, X } from 'lucide-react';

const Section = ({ title, children }) => (
  <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
    </div>
    {children}
  </div>
);

const FilterChip = ({ active, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
      active ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-600 hover:border-primary/50'
    }`}
  >
    {label}
  </button>
);

const SearchFilters = ({
  filters,
  availableFilters,
  onToggle,
  onPriceChange,
  onClearAll,
  className = '',
}) => {
  const [localPrice, setLocalPrice] = useState({
    min: filters.price?.min || '',
    max: filters.price?.max || '',
  });

  const availabilityOptions = useMemo(() => availableFilters?.availability || [], [availableFilters]);

  return (
    <aside className={`space-y-5 ${className}`}>
      <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Filter className="h-4 w-4 text-primary" />
          Filters
        </div>
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs font-medium text-gray-500 transition hover:text-primary"
        >
          Reset all
        </button>
      </div>

      <Section title="Price (PKR)">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Min</label>
            <input
              type="number"
              inputMode="numeric"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
              placeholder="0"
              value={localPrice.min}
              onChange={(event) => setLocalPrice((prev) => ({ ...prev, min: event.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Max</label>
            <input
              type="number"
              inputMode="numeric"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
              placeholder={availableFilters?.price?.max ? `≤ ${availableFilters.price.max}` : 'Any'}
              value={localPrice.max}
              onChange={(event) => setLocalPrice((prev) => ({ ...prev, max: event.target.value }))}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              onPriceChange({
                min: localPrice.min ? Number(localPrice.min) : null,
                max: localPrice.max ? Number(localPrice.max) : null,
              });
            }}
            className="flex-1 rounded-full bg-primary px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-white"
          >
            Apply
          </button>
          {(filters.price?.min || filters.price?.max) && (
            <button
              type="button"
              onClick={() => {
                setLocalPrice({ min: '', max: '' });
                onPriceChange({ min: null, max: null });
              }}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
      </Section>

      {availableFilters?.brands?.length > 0 && (
        <Section title="Brands">
          <div className="flex flex-wrap gap-2">
            {availableFilters.brands.map((brand) => (
              <FilterChip
                key={brand.value}
                label={`${brand.label} (${brand.count})`}
                active={filters.brands?.includes(brand.value)}
                onClick={() => onToggle('brands', brand.value)}
              />
            ))}
          </div>
        </Section>
      )}

      {availableFilters?.categories?.length > 0 && (
        <Section title="Categories">
          <div className="flex flex-col gap-2">
            {availableFilters.categories.map((category) => (
              <label
                key={category.value || category.id}
                className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={filters.categories?.includes(category.value || category.id)}
                    onChange={() => onToggle('categories', category.value || category.id)}
                  />
                  <span className="font-medium text-gray-800">{category.label || category.name}</span>
                </div>
                <span className="text-xs text-gray-500">{category.count}</span>
              </label>
            ))}
          </div>
        </Section>
      )}

      {availableFilters?.colors?.length > 0 && (
        <Section title="Colors">
          <div className="flex flex-wrap gap-2">
            {availableFilters.colors.map((color) => (
              <FilterChip
                key={color.value || color._id}
                label={`${color.label || color._id} (${color.count})`}
                active={filters.colors?.includes(color.value || color._id)}
                onClick={() => onToggle('colors', color.value || color._id)}
              />
            ))}
          </div>
        </Section>
      )}

      {availableFilters?.sizes?.length > 0 && (
        <Section title="Sizes">
          <div className="flex flex-wrap gap-2">
            {availableFilters.sizes.map((size) => (
              <FilterChip
                key={size.value || size._id}
                label={`${size.label || size._id} (${size.count})`}
                active={filters.sizes?.includes(size.value || size._id)}
                onClick={() => onToggle('sizes', size.value || size._id)}
              />
            ))}
          </div>
        </Section>
      )}

      {availabilityOptions.length > 0 && (
        <Section title="Availability">
          <div className="flex flex-wrap gap-2">
            {availabilityOptions.map((option) => (
              <FilterChip
                key={option.value || option._id}
                label={`${option.label || option._id} (${option.count})`}
                active={filters.availability?.includes(option.value || option._id)}
                onClick={() => onToggle('availability', option.value || option._id)}
              />
            ))}
          </div>
        </Section>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-xs text-gray-500">
          Applying filters narrows the result set and refreshes the available filters list in real time, just like
          Shopify&apos;s faceted navigation.
        </p>
      </div>
    </aside>
  );
};

export default SearchFilters;

