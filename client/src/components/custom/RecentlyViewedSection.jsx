import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import ProductCard from './ProductCard';
import NavigationButtons from './NavigationButtons';
import { getRecentlyViewed } from '@/utils/recentlyViewed';

const RecentlyViewedSection = () => {
  const navigate = useNavigate();
  const swiperRef = React.useRef(null);
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(false);
  const [products, setProducts] = useState(() => getRecentlyViewed());

  useEffect(() => {
    setProducts(getRecentlyViewed());
  }, []);

  const handleProductClick = (product) => {
    if (!product || (!product._id && !product.slug)) return;
    window.scrollTo({ top: 0, behavior: 'auto' });
    navigate(`/product/${product.slug || product._id}`);
  };

  if (products.length === 0) return null;

  return (
    <section className="max-w-[1800px] mx-auto px-3 sm:px-4 lg:px-6 pt-2 sm:pt-3 pb-3 md:pb-4 lg:pb-5">
      <div className="mb-3 md:mb-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-caramel-deep mb-1">Your history</p>
        <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-semibold text-espresso tracking-tight">
          Recently Viewed
        </h2>
      </div>

      <div className="relative group px-2 py-2 sm:px-6">
        <Swiper
          ref={swiperRef}
          modules={[Navigation]}
          spaceBetween={10}
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
          onSlideChange={(swiper) => {
            setIsBeginning(swiper.isBeginning);
            setIsEnd(swiper.isEnd);
          }}
          onInit={(swiper) => {
            setIsBeginning(swiper.isBeginning);
            setIsEnd(swiper.isEnd);
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
      </div>
    </section>
  );
};

export default RecentlyViewedSection;
