import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import { ArrowRight } from 'lucide-react';
import productService from '@/redux/slices/products/productService';
import ProductCard from './ProductCard';
import ProductCardSkeleton from './ProductCardSkeleton';
import NavigationButtons from './NavigationButtons';

const getTimeUntilMidnight = () => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diffMs = midnight.getTime() - now.getTime();
  return {
    hours: Math.floor(diffMs / (1000 * 60 * 60)),
    minutes: Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diffMs % (1000 * 60)) / 1000)
  };
};

const pad = (value) => String(value).padStart(2, '0');

const CountdownBox = ({ value, label }) => (
  <span
    className="flex h-6 min-w-6 items-center justify-center rounded-md bg-brand px-1 text-[11px] font-bold tabular-nums text-white"
    aria-label={`${value} ${label}`}
  >
    {pad(value)}
  </span>
);

/**
 * Generic home-page product carousel (Daily Deals, Recommendation For You, …).
 * Fetches its own data straight from the API so it never clobbers the main
 * product list in redux.
 */
const HomeProductRail = ({ title, eyebrow, params = {}, viewAllHref, viewAllLabel = 'View all', showCountdown = false }) => {
  const navigate = useNavigate();
  const swiperRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading');
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(false);
  const [timeLeft, setTimeLeft] = useState(() => (showCountdown ? getTimeUntilMidnight() : null));

  useEffect(() => {
    if (!showCountdown) return undefined;
    const interval = setInterval(() => setTimeLeft(getTimeUntilMidnight()), 1000);
    return () => clearInterval(interval);
  }, [showCountdown]);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    productService
      .allProduct({ page: 1, limit: 12, stockFilter: 'active', ...params })
      .then((res) => {
        if (!alive) return;
        setProducts(Array.isArray(res?.data) ? res.data : []);
        setStatus('succeeded');
      })
      .catch(() => {
        if (!alive) return;
        setProducts([]);
        setStatus('failed');
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)]);

  const handleProductClick = (product) => {
    if (!product || (!product._id && !product.slug)) return;
    window.scrollTo({ top: 0, behavior: 'auto' });
    navigate(`/product/${product.slug || product._id}`);
  };

  if (status === 'failed' || (status === 'succeeded' && products.length === 0)) return null;

  return (
    <section className="max-w-[1800px] mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <div>
          {eyebrow && (
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand mb-1">{eyebrow}</p>
          )}
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-espresso">
              {title}
            </h2>
            {showCountdown && timeLeft && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-soft px-2 py-1 text-[11px] font-semibold text-brand" role="timer">
                Ends in
                <CountdownBox value={timeLeft.hours} label="hours" />
                <span aria-hidden="true">:</span>
                <CountdownBox value={timeLeft.minutes} label="minutes" />
                <span aria-hidden="true">:</span>
                <CountdownBox value={timeLeft.seconds} label="seconds" />
              </span>
            )}
          </div>
        </div>
        {viewAllHref && (
          <Link
            to={viewAllHref}
            className="hidden md:inline-flex items-center gap-1.5 text-sm font-semibold text-mocha transition-colors hover:text-brand"
          >
            {viewAllLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      <div className="relative group">
        {status === 'loading' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} gridType="grid2" showCartControls={false} />
            ))}
          </div>
        ) : (
          <>
            <Swiper
              ref={swiperRef}
              modules={[Navigation]}
              spaceBetween={8}
              observer
              observeParents
              breakpoints={{
                320: { slidesPerView: 2.3 },
                480: { slidesPerView: 2 },
                640: { slidesPerView: 3 },
                768: { slidesPerView: 3 },
                1024: { slidesPerView: 4 },
                1536: { slidesPerView: 5 },
                1800: { slidesPerView: 6 },
              }}
              slidesPerView={2.3}
              onSlideChange={(s) => {
                setIsBeginning(s.isBeginning);
                setIsEnd(s.isEnd);
              }}
              onInit={(s) => {
                setIsBeginning(s.isBeginning);
                setIsEnd(s.isEnd);
              }}
            >
              {products.map((product) => (
                <SwiperSlide key={product._id} className="!h-auto">
                  <div className="h-full flex px-1">
                    <ProductCard
                      product={product}
                      gridType="grid2"
                      onProductClick={handleProductClick}
                      showCartControls={false}
                      showQuickAdd
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
            <NavigationButtons
              isBeginning={isBeginning}
              isEnd={isEnd}
              swiperRef={swiperRef}
              showOnMobile={false}
            />
          </>
        )}
      </div>
    </section>
  );
};

export default HomeProductRail;
