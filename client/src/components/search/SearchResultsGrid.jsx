import { Link } from 'react-router-dom';
import OneLoader from '@/components/ui/OneLoader';

const SearchResultCard = ({ product }) => {
  const image =
    product.image ||
    product.images?.find?.((img) => img.isPrimary)?.secure_url ||
    product.images?.[0]?.secure_url ||
    'https://images.unsplash.com/photo-1467043153537-a4f570958f30?w=400&h=400&fit=crop';
  return (
    <Link
      to={`/product/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative overflow-hidden">
        <img src={image} alt={product.title} className="h-56 w-full object-cover transition duration-300 group-hover:scale-105" />
        {product.stockStatus === 'out-of-stock' && (
          <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase text-gray-700">
            Sold out
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{product.brand || 'Curated brand'}</p>
        <p className="line-clamp-2 text-sm font-semibold text-gray-900">{product.title}</p>
        <p className="text-xs text-gray-500">{product.description?.slice(0, 80)}</p>
        <div className="mt-auto flex items-baseline gap-2">
          <span className="text-lg font-bold text-gray-900">Rs {product.effectivePrice || product.price}</span>
          {product.salePrice && (
            <span className="text-xs text-gray-400 line-through">Rs {product.price}</span>
          )}
        </div>
      </div>
    </Link>
  );
};

const SearchResultsGrid = ({ items = [], loading, query, onRetry }) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-16 shadow-sm">
        <OneLoader size="medium" text="Searching inventory…" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white/80 p-12 text-center shadow-sm">
        <p className="text-lg font-semibold text-gray-900">No products found</p>
        {query && (
          <p className="mt-1 text-sm text-gray-500">
            Try refining your search or removing filters for “{query}”.
          </p>
        )}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-700 transition hover:border-primary hover:text-primary"
          >
            Clear filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((product) => (
        <SearchResultCard key={product.id || product._id} product={product} />
      ))}
    </div>
  );
};

export default SearchResultsGrid;

