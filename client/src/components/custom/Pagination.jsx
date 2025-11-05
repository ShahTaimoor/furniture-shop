import React, { useMemo } from 'react';

const Pagination = React.memo(({ 
  currentPage, 
  totalPages, 
  onPageChange 
}) => {
  const visiblePages = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    const pages = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    if (start > 1) {
      pages.unshift(1);
      if (start > 2) {
        pages.splice(1, 0, '...');
      }
    }
    
    if (end < totalPages) {
      if (end < totalPages - 1) {
        pages.push('...');
      }
      pages.push(totalPages);
    }
    
    return pages;
  }, [currentPage, totalPages]);

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  if (totalPages <= 1) return null;

  return (
    <div className="relative overflow-hidden">
      

      <div className="relative flex items-center justify-center gap-1 mt-10 overflow-x-auto scrollbar-hide max-w-full">
        {/* Previous Button */}
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1}
          className="relative flex items-center justify-center h-8 px-2 rounded-full bg-white/90 backdrop-blur-sm text-xs text-gray-700 hover:bg-red-50 hover:text-primary hover:border-primary hover:scale-[1.01] active:scale-95 transition-all border border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>

        {/* Page Numbers */}
        {visiblePages.map((page, index) => (
          <button
            key={page === '...' ? `ellipsis-${index}` : page}
            onClick={() => typeof page === 'number' && onPageChange(page)}
            disabled={page === '...'}
            className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-medium transition-all hover:scale-[1.01] ${
              page === currentPage
                ? 'bg-gradient-to-br from-[#DC2626] to-[#991B1B] text-white border-[#DC2626] shadow-lg shadow-red-500/30'
                : page === '...'
                  ? 'bg-transparent text-gray-400 cursor-default'
                  : 'bg-white/90 backdrop-blur-sm text-gray-700 border-gray-200 hover:bg-red-50 hover:text-primary hover:border-primary'
            } border`}
            aria-label={page === '...' ? 'More pages' : `Page ${page}`}
          >
            {page}
          </button>
        ))}

        {/* Next Button */}
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="relative flex items-center justify-center h-8 px-2 rounded-full bg-white/90 backdrop-blur-sm text-xs text-gray-700 hover:bg-red-50 hover:text-primary hover:border-primary hover:scale-[1.01] active:scale-95 transition-all border border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          Next
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
});

export default Pagination;

