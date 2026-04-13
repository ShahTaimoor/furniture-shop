import React, { useRef, useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import NavigationButtons from './NavigationButtons';
import { ChevronRight } from 'lucide-react';

const breakpoints = {
  320: { slidesPerView: 2.2, spaceBetween: 12 },
  480: { slidesPerView: 3.1, spaceBetween: 14 },
  640: { slidesPerView: 4, spaceBetween: 16 },
  768: { slidesPerView: 5, spaceBetween: 18 },
  1024: { slidesPerView: 6, spaceBetween: 18 },
  1280: { slidesPerView: 7, spaceBetween: 20 },
  1536: { slidesPerView: 8, spaceBetween: 20 }
};

const CategorySwiper = React.memo(({ categories = [], selectedCategory, onCategorySelect, onNavigateDown }) => {
  const swiperRef = useRef(null);
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(false);

  useEffect(() => {
    if (!swiperRef.current?.swiper) return;
      swiperRef.current.swiper.update();
  }, [categories]);

  return (
    <div className="relative group px-2 sm:px-6">
      <Swiper
        ref={swiperRef}
        modules={[Navigation]}
        navigation={{
          nextEl: '.custom-swiper-button-next',
          prevEl: '.custom-swiper-button-prev',
          disabledClass: 'swiper-button-disabled'
        }}
        spaceBetween={18}
        breakpoints={breakpoints}
        slidesPerView={2.2}
        onSlideChange={(swiper) => {
          setIsBeginning(swiper.isBeginning);
          setIsEnd(swiper.isEnd);
        }}
        onInit={(swiper) => {
          setIsBeginning(swiper.isBeginning);
          setIsEnd(swiper.isEnd);
            swiper.navigation.update();
        }}
        className="category-strip"
      >
        {categories
          .filter((category) => category && category._id)
          .map((category) => {
            const showNavigate = category.hasChildren || (Array.isArray(category.children) && category.children.length > 0);
                return (
              <SwiperSlide key={category._id} className="!w-auto">
                <CategoryTile
                  category={category}
                  isSelected={selectedCategory === category._id}
                    onSelect={onCategorySelect}
                  onNavigateDown={showNavigate ? () => onNavigateDown?.(category) : undefined}
                  />
              </SwiperSlide>
                );
              })}
      </Swiper>

      <NavigationButtons isBeginning={isBeginning} isEnd={isEnd} swiperRef={swiperRef} />
    </div>
  );
});

const CategoryTile = React.memo(({ category, isSelected, onSelect, onNavigateDown }) => {
  const handleClick = () => onSelect(category);
  const label = (category?.name || 'Category')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex w-32 sm:w-36 flex-col items-center gap-3 rounded-2xl border border-transparent bg-white px-3 py-4 text-center transition-all hover:border-primary/80 hover:bg-slate-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      aria-label={`Browse ${label}`}
    >
      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl bg-white">
        <img
          src={category?.image || category?.picture?.secure_url || '/logo.svg'}
          alt={label}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = '/logo.svg';
          }}
        />
      </div>
      <div className="flex items-center justify-center gap-2">
        <span className={`text-xs font-medium leading-tight text-slate-800 ${isSelected ? 'text-primary' : ''}`}>
          {label}
        </span>
         
      </div>
    </button>
  );
});

export default CategorySwiper;