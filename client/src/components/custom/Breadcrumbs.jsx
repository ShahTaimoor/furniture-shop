import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';

const normalizeBasePath = (basePath = '/') => {
  if (!basePath) return '';
  if (basePath === '/') return '';
  return basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
};

const slugFromItem = (item) => {
  if (item?.slug) return item.slug;
  if (item?.path) {
    // assume last segment of path
    const parts = item.path.split('/').filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  if (item?.name) {
    return item.name
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');
  }
  return '';
};

const Breadcrumbs = ({ items = [], basePath = '/category' }) => {
  const hasItems = Array.isArray(items) && items.length > 0;
  const normalizedBase = normalizeBasePath(basePath);

  const breadcrumbSegments = useMemo(() => {
    if (!hasItems) return [];

    const segments = [];
    return items.map((item) => {
      const slug = slugFromItem(item);
      if (slug) {
        segments.push(slug);
      }
      return {
        ...item,
        slug,
        href: `${normalizedBase}/${segments.join('/')}`.replace(/\/{2,}/g, '/'),
      };
    });
  }, [items, hasItems, normalizedBase]);

  if (!hasItems) {
    return null;
  }

  return (
    <nav
      className="flex flex-wrap items-center gap-1 text-sm text-slate-500"
      aria-label="Breadcrumb"
    >
      <Link
        to="/"
        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600 transition hover:bg-primary/10 hover:text-primary"
      >
        Home
      </Link>
      {breadcrumbSegments.map((item, index) => {
        const isLast = index === breadcrumbSegments.length - 1;
        return (
          <React.Fragment key={item.slug || item._id || item.name || index}>
            <span className="text-slate-300">/</span>
            {isLast ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
                {item.name}
              </span>
            ) : (
              <Link
                to={item.href || '/'}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600 transition hover:bg-primary/10 hover:text-primary max-w-[12rem] truncate"
              >
                {item.name}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default React.memo(Breadcrumbs);