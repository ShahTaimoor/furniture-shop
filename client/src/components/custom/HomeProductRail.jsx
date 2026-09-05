import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import { ChevronRight } from 'lucide-react';
import productService from '@/redux/slices/products/productService';
import ProductCard from './ProductCard';
import ProductCardSkeleton from './ProductCardSkeleton';
import NavigationButtons from './NavigationButtons';

/**
 * Generic home-page product carousel (Daily Deals, Recommendation For You, …).
 * Fetches its own data straight from the API so it never clobbers the main
 * product list in redux.
 */
const HomeProductRail = ({ title, eyebrow, params = {}, viewAllHref, viewAllLabel = 'View all' }) => {
  const navigate = useNavigate();
  const swiperRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading');
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(false);

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
    <section className="max-w-[1800px] mx-auto px-3 sm:px-4 lg:px-6">
      <div className="mb-3 flex items-end justify-between md:mb-4">
        <div>
          {eyebrow && (
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-caramel-deep mb-1">{eyebrow}</p>
          )}
          <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-semibold text-espresso tracking-tight">
            {title}
          </h2>
        </div>
        {viewAllHref && (
          <Link
            to={viewAllHref}
            className="hidden md:inline-flex items-center gap-1.5 text-sm font-semibold text-mocha transition-colors hover:text-espresso"
          >
            {viewAllLabel}
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      <div className="relative group px-2 sm:px-6">
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
              spaceBetween={10}
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
