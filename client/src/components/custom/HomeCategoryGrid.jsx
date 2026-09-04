import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowRight } from 'lucide-react';
import { AllCategory } from '@/redux/slices/categories/categoriesSlice';

const HomeCategoryGrid = ({ limit = 6 }) => {
  const dispatch = useDispatch();
  const { categories = [], status } = useSelector((state) => state.categories);

  useEffect(() => {
    if (status === 'idle') dispatch(AllCategory());
  }, [dispatch, status]);

  const topCategories = useMemo(() => {
    const roots = categories.filter(
      (c) => c && (c.level === 0 || !c.parentId) && c.slug
    );
    return (roots.length ? roots : categories.filter((c) => c?.slug)).slice(0, limit);
  }, [categories, limit]);

  if (topCategories.length === 0) return null;

  return (
    <section className="max-w-[1800px] mx-auto px-3 sm:px-4 lg:px-6">
      <div className="mb-3 flex items-end justify-between md:mb-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-caramel-deep mb-1">Browse</p>
          <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-semibold text-espresso tracking-tight">
            Shop by Category
          </h2>
        </div>
        <Link
          to="/categories"
          className="hidden md:inline-flex items-center gap-1.5 text-sm font-semibold text-mocha transition-colors hover:text-espresso"
        >
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {topCategories.map((category) => (
          <Link
            key={category._id}
            to={`/category/${category.slug}`}
            className="group relative flex flex-col items-center gap-2.5 overflow-hidden rounded-2xl border border-latte bg-card p-4 text-center transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-caramel/40 hover:shadow-[0_14px_30px_-14px_rgba(43,29,23,0.22)]"
          >
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-latte-soft">
              <img
                src={category.image || '/logo.svg'}
                alt={category.name}
                loading="lazy"
                className="h-full w-full object-contain p-1 transition-transform duration-500 ease-out group-hover:scale-110"
                onError={(event) => {
                  event.currentTarget.src = '/logo.svg';
                }}
              />
            </div>
            <span className="text-xs font-semibold text-espresso line-clamp-1 group-hover:text-caramel-deep transition-colors">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default HomeCategoryGrid;
