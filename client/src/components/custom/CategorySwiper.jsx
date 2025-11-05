import React, { useMemo, useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

const CategorySwiper = React.memo(({ 
  categories, 
  selectedCategory, 
  onCategorySelect 
}) => {
  const [chunkSize, setChunkSize] = useState(4);

  useEffect(() => {
    const handleResize = () => {
      // Desktop/laptop: 8 categories, Mobile/tablet: 4 categories
      setChunkSize(window.innerWidth >= 1024 ? 8 : 4);
    };
    
    handleResize(); // Set initial value
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const categoryChunks = useMemo(() => {
    const chunkArray = (array, size) => {
      const result = [];
      for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
      }
      return result;
    };
    return chunkArray(categories, chunkSize);
  }, [categories, chunkSize]);

  return (
    <div className="relative px-2 sm:px-10">
      <Swiper
        pagination={{ clickable: true }}
        modules={[Pagination, Navigation]}
        spaceBetween={10}
        navigation={{
          nextEl: '.custom-swiper-button-next',
          prevEl: '.custom-swiper-button-prev'
        }}
        className="mySwiper"
      >
        {categoryChunks.map((chunk, idx) => (
          <SwiperSlide key={idx}>
            <div className="grid grid-cols-4 lg:grid-cols-8 mt-4  pb-6 gap-2">
              {chunk.filter(cat => cat && cat._id).map((cat, index) => (
                <CategoryItem
                  key={cat._id}
                  category={cat}
                  isSelected={selectedCategory === cat._id}
                  onSelect={onCategorySelect}
                  index={index}
                />
              ))}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      <NavigationButtons />
    </div>
  );
});

const CategoryItem = React.memo(({ category, isSelected, onSelect, index }) => (
  <div
    className={`flex flex-col items-center rounded-xl  ${
      isSelected
        ? 'border border-primary shadow-md'
        : 'hover:shadow-sm'
    } cursor-pointer text-center bg-white/80 backdrop-blur-sm transition-all hover:scale-105 active:scale-95`}
    onClick={() => onSelect(category?._id)}
    role="button"
    tabIndex="0"
    aria-label={`Filter by ${category?.name || "Category"}`}
    onKeyDown={(e) => e.key === 'Enter' && onSelect(category?._id)}
  >
    <div className="rounded-full ">
      <img
        src={category?.image || category?.picture?.secure_url || "/fallback.jpg"}
        alt={category?.name || "Category"}
        className="w-14 h-14 object-cover rounded-full border-2 border-white/30"
        loading="lazy"
        width="56"
        height="56"
        onError={(e) => {
          e.currentTarget.src = "/fallback.jpg";
        }}
      />
    </div>
    <p className="text-xs mt-1 font-medium text-gray-700">
      {(category?.name || "Category").split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ')}
    </p>
  </div>
));

const NavigationButtons = React.memo(() => (
  <div className="hidden lg:block">
    {/* Previous Button */}
    <div className="custom-swiper-button-prev absolute top-1/2 left-2 z-20 -translate-y-1/2 cursor-pointer group">
      <div className="relative p-3 rounded-full bg-gradient-to-br from-red-500 via-red-600 to-red-700 shadow-xl hover:shadow-2xl hover:shadow-red-500/50 transition-all duration-300 ease-in-out hover:scale-110 active:scale-95 border border-red-400/50 backdrop-blur-sm">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <svg
          className="w-4 h-4 text-white relative z-10 drop-shadow-lg"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </div>
    </div>

    {/* Next Button */}
    <div className="custom-swiper-button-next absolute top-1/2 right-2 z-20 -translate-y-1/2 cursor-pointer group">
      <div className="relative p-3 rounded-full bg-gradient-to-br from-red-500 via-red-600 to-red-700 shadow-xl hover:shadow-2xl hover:shadow-red-500/50 transition-all duration-300 ease-in-out hover:scale-110 active:scale-95 border border-red-400/50 backdrop-blur-sm">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <svg
          className="w-4 h-4 text-white relative z-10 drop-shadow-lg"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  </div>
));

export default CategorySwiper;

