import { X } from 'lucide-react';

const buildChips = (filters, availableFilters) => {
  const chips = [];

  if (filters.brands?.length) {
    filters.brands.forEach((brand) => {
      chips.push({ key: 'brands', value: brand, label: brand });
    });
  }

  if (filters.categories?.length) {
    filters.categories.forEach((category) => {
      const label =
        availableFilters?.categories?.find((cat) => cat.value === category || cat.id === category)?.label || category;
      chips.push({ key: 'categories', value: category, label });
    });
  }

  if (filters.colors?.length) {
    filters.colors.forEach((color) => {
      chips.push({ key: 'colors', value: color, label: color });
    });
  }

  if (filters.sizes?.length) {
    filters.sizes.forEach((size) => {
      chips.push({ key: 'sizes', value: size, label: size });
    });
  }

  if (filters.availability?.length) {
    filters.availability.forEach((option) => {
      chips.push({ key: 'availability', value: option, label: option });
    });
  }

  if (filters.price?.min) {
    chips.push({ key: 'price', value: 'min', label: `Min ${filters.price.min}` });
  }
  if (filters.price?.max) {
    chips.push({ key: 'price', value: 'max', label: `Max ${filters.price.max}` });
  }

  return chips;
};

const SearchSummary = ({ query, filters, availableFilters, onRemoveFilter, onClearAll }) => {
  const chips = buildChips(filters, availableFilters);

  return (
    <div className="space-y-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
        {query ? (
          <>
            Showing results for <span className="font-semibold text-gray-900">“{query}”</span>
          </>
        ) : (
          <>Showing curated products</>
        )}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              key={`${chip.key}-${chip.value}`}
              type="button"
              onClick={() => onRemoveFilter(chip.key, chip.value)}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700 transition hover:border-primary hover:text-primary"
            >
              {chip.label}
              <X className="h-3 w-3" />
            </button>
          ))}
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center gap-2 rounded-full border border-transparent px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchSummary;

