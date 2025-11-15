import React from 'react';

const NavigationButtons = ({ 
  isBeginning, 
  isEnd, 
  onPrevClick, 
  onNextClick,
  scrollContainerRef,
  swiperRef,
  scrollStep = null,
  showOnMobile = false 
}) => {
  const showPrev = !isBeginning;
  const showNext = !isEnd;

  // Handle previous click
  const handlePrevClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // If custom handler provided, use it
    if (onPrevClick) {
      onPrevClick(e);
      return;
    }

    // Swiper navigation
    if (swiperRef?.current?.swiper && !isBeginning) {
      swiperRef.current.swiper.slidePrev();
      return;
    }

    // Scroll container navigation
    if (scrollContainerRef?.current && !isBeginning) {
      const step = scrollStep || 500; // Default scroll step
      scrollContainerRef.current.scrollBy({
        left: -step,
        behavior: 'smooth'
      });
    }
  };

  // Handle next click
  const handleNextClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // If custom handler provided, use it
    if (onNextClick) {
      onNextClick(e);
      return;
    }

    // Swiper navigation
    if (swiperRef?.current?.swiper && !isEnd) {
      swiperRef.current.swiper.slideNext();
      return;
    }

    // Scroll container navigation
    if (scrollContainerRef?.current && !isEnd) {
      const step = scrollStep || 500; // Default scroll step
      scrollContainerRef.current.scrollBy({
        left: step,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className={showOnMobile ? "block" : "hidden lg:block"}>
      {/* Previous Button */}
      {showPrev && (
        <button
          type="button"
          onClick={handlePrevClick}
          className="absolute top-1/2 left-2 z-20 -translate-y-1/2 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-transparent border-none p-0 outline-none"
          aria-label="Previous"
        >
          <div className="relative p-2 rounded-full bg-gray-700 hover:bg-gray-800 shadow-md transition-all duration-200">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </div>
        </button>
      )}

      {/* Next Button */}
      {showNext && (
        <button
          type="button"
          onClick={handleNextClick}
          className="absolute top-1/2 right-2 z-20 -translate-y-1/2 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-transparent border-none p-0 outline-none"
          aria-label="Next"
        >
          <div className="relative p-2 rounded-full bg-gray-700 hover:bg-gray-800 shadow-md transition-all duration-200">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      )}
    </div>
  );
};

export default NavigationButtons;

