import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import productService from '@/redux/slices/products/productService';
import { selectCurrency } from '@/redux/slices/settings/settingsSlice';
import { formatCurrency } from '@/utils/currency';

const Row = ({ product, currency }) => {
  const price = Number(product?.price ?? 0);
  const sale = Number(product?.salePrice ?? price);
  const onSale = sale > 0 && sale < price;
  const img =
    product?.image ||
    product?.picture?.secure_url ||
    product?.images?.[0]?.secure_url ||
    '/logo.svg';

  return (
    <Link
      to={`/product/${product.slug || product._id}`}
      className="group flex items-center gap-3 rounded-xl p-2 transition-colors duration-200 hover:bg-latte-soft"
    >
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-latte bg-card">
        <img
          src={img}
          alt={product.title}
          loading="lazy"
          className="h-full w-full object-contain p-1 transition-transform duration-500 ease-out group-hover:scale-105"
          onError={(e) => {
            e.currentTarget.src = '/logo.svg';
          }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[13px] font-semibold text-espresso leading-snug group-hover:text-caramel-deep transition-colors">
          {product.title}
        </p>
        <p className="mt-0.5 flex items-baseline gap-1.5 text-xs">
          <span className="font-bold text-espresso">{formatCurrency(sale || price, currency)}</span>
          {onSale && (
            <span className="text-mocha/50 line-through">{formatCurrency(price, currency)}</span>
          )}
        </p>
      </div>
    </Link>
  );
};

const Column = ({ title, products, currency }) => (
  <div>
    <h2 className="font-display text-lg sm:text-xl font-semibold text-espresso tracking-tight">{title}</h2>
    <div className="mt-2 h-0.5 w-12 rounded-full bg-caramel" />
    <div className="mt-3 divide-y divide-latte rounded-2xl border border-latte bg-card p-1.5">
      {products.map((p) => (
        <Row key={p._id} product={p} currency={currency} />
      ))}
    </div>
  </div>
);

const HomeProductColumns = () => {
  const currency = useSelector(selectCurrency);
  const [onsale, setOnsale] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let alive = true;
    Promise.allSettled([
      productService.allProduct({ page: 1, limit: 4, stockFilter: 'active', onSale: true, sortBy: 'sale' }),
      productService.allProduct({ page: 1, limit: 4, stockFilter: 'active', sortBy: 'top-rated' }),
    ]).then(([a, b]) => {
      if (!alive) return;
      setOnsale(a.status === 'fulfilled' && Array.isArray(a.value?.data) ? a.value.data : []);
      setTopRated(b.status === 'fulfilled' && Array.isArray(b.value?.data) ? b.value.data : []);
      setStatus('done');
    });
    return () => {
      alive = false;
    };
  }, []);

  if (status === 'done' && onsale.length === 0 && topRated.length === 0) return null;

  return (
    <section className="max-w-[1800px] mx-auto px-3 sm:px-4 lg:px-6">
      <div className="grid gap-8 md:grid-cols-2">
        {onsale.length > 0 && <Column title="On Sale Products" products={onsale} currency={currency} />}
        {topRated.length > 0 && <Column title="Top Rated Products" products={topRated} currency={currency} />}
      </div>
    </section>
  );
};

export default HomeProductColumns;
