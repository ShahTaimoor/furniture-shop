import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowRight, LayoutGrid } from 'lucide-react';

const titleCase = (name = '') =>
  name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

/**
 * "Shop by Category" image tiles for the home page (top-level categories only).
 * Renders nothing until categories exist.
 */
const HomeCategories = () => {
  const { categories = [], status } = useSelector((s) => s.categories);

  const topLevel = useMemo(() => {
    if (!Array.isArray(categories)) return [];
    return categories
      .filter((cat) => cat && cat._id && !cat.parentId)
      .sort((a, b) => {
        const posA = a?.position ?? 999;
        const posB = b?.position ?? 999;
        if (posA !== posB) return posA - posB;
        return a.name.localeCompare(b.name);
      })
      .map((cat) => ({
        ...cat,
        childCount: categories.filter((child) => child.parentId === cat._id).length,
      }));
  }, [categories]);

  const loading = status === 'loading' && topLevel.length === 0;
  if (!loading && topLevel.length === 0) return null;

  return (
    <section className="max-w-[1800px] mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-espresso sm:text-2xl">Shop by Category</h2>
        <Link
          to="/categories"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-mocha transition-colors hover:text-brand"
        >
          View All
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide sm:gap-4 lg:grid lg:grid-cols-5 lg:overflow-visible xl:grid-cols-6">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-36 shrink-0 lg:w-auto">
                <div className="skeleton-warm aspect-square rounded-2xl" />
                <div className="skeleton-warm mt-3 h-3.5 w-2/3 rounded" />
              </div>
            ))
          : topLevel.slice(0, 12).map((category) => (
              <Link
                key={category._id}
                to={`/category/${category.slug}`}
                className="group w-36 shrink-0 lg:w-auto"
                aria-label={`Browse ${titleCase(category.name)}`}
              >
                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-latte bg-latte-soft transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-1 group-hover:border-brand/40 group-hover:shadow-[0_18px_34px_-18px_rgba(91,79,245,0.5)]">
                  {category.picture?.secure_url ? (
                    <img
                      src={category.picture.secure_url}
                      alt={category.picture.alt || ''}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <LayoutGrid className="h-9 w-9 text-brand/50" strokeWidth={1.5} />
                  )}
                </div>
                <p className="mt-3 text-sm font-bold text-espresso transition-colors group-hover:text-brand">
                  {titleCase(category.name)}
                </p>
                {category.childCount > 0 && (
                  <p className="mt-0.5 text-xs text-mocha">
                    {category.childCount} {category.childCount === 1 ? 'subcategory' : 'subcategories'}
                  </p>
                )}
              </Link>
            ))}
      </div>
    </section>
  );
};

export default HomeCategories;
