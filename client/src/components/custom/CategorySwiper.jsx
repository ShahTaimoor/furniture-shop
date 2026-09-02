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
      className={`group flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-3.5 sm:px-4 py-2 text-center transition-all duration-150 hover:border-slate-400 active:scale-95 focus-visible:outline-none ${
        isSelected
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
      }`}
      aria-label={`Browse ${label}`}
    >
      <span className={`text-xs sm:text-sm font-bold tracking-tight ${isSelected ? 'text-white' : 'text-slate-800'}`}>
        {label}
      </span>
      {onNavigateDown && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onNavigateDown();
          }}
          className={`flex h-4 w-4 items-center justify-center rounded-full transition ${
            isSelected ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
          }`}
        >
          <ChevronRight size={11} />
        </span>
      )}
    </button>
  );
});

export default CategorySwiper;