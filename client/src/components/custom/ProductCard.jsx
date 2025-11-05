import React, { useRef, useCallback, useEffect } from 'react';
import OneLoader from '../ui/OneLoader';
import LazyImage from '../ui/LazyImage';
import { Badge } from '../ui/badge';
import { highlightSearchTerm, truncateAndHighlight } from '@/utils/searchHighlight.jsx';

const ProductCard = React.memo(({
  product,
  quantity,
  onQuantityChange,
  onAddToCart,
  isAddingToCart,
  isInCart,
  gridType,
  setPreviewImage,
  searchTerm = ''
}) => {
  const imgRef = useRef(null);
  const clickAudioRef = useRef(null);

  // Initialize audio only once
  useEffect(() => {
    clickAudioRef.current = new Audio('/sounds/click.mp3');
    return () => {
      if (clickAudioRef.current) {
        clickAudioRef.current.pause();
        clickAudioRef.current = null;
      }
    };
  }, []);

  const handleAddClick = useCallback((e) => {
    // Prevent default behavior and stop propagation for iPhone compatibility
    e.preventDefault();
    e.stopPropagation();
    
    if (clickAudioRef.current) {
      clickAudioRef.current.currentTime = 0;
      clickAudioRef.current.play();
    }
    onAddToCart(product);
  }, [onAddToCart, product]);

  // iPhone Safari touch event handler
  const handleTouchStart = useCallback((e) => {
    // Don't prevent default for touch start to avoid passive listener issues
    e.stopPropagation();
  }, []);

  const handleTouchEnd = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent click event from firing after touch
    handleAddClick(e);
  }, [handleAddClick]);

  const handleQuantityChange = useCallback((value) => {
    if (value === '') {
      onQuantityChange(product._id, '', product.stock);
      return;
    }
    const parsed = parseInt(value);
    if (!isNaN(parsed)) {
      onQuantityChange(product._id, parsed, product.stock);
    }
  }, [onQuantityChange, product._id, product.stock]);

  const handleDecrease = useCallback((e) => {
    e.stopPropagation();
    const newValue = Math.max((parseInt(quantity) || 1) - 1, 1);
    onQuantityChange(product._id, newValue, product.stock);
  }, [quantity, onQuantityChange, product._id, product.stock]);

  const handleIncrease = useCallback((e) => {
    e.stopPropagation();
    const newValue = Math.min((parseInt(quantity) || 1) + 1, product.stock);
    onQuantityChange(product._id, newValue, product.stock);
  }, [quantity, onQuantityChange, product._id, product.stock]);

  const handleImageClick = useCallback(() => {
    setPreviewImage(product.image || product.picture?.secure_url || '/logo.jpeg');
  }, [setPreviewImage, product.image, product.picture]);

  const handleImageError = useCallback((e) => {
    e.currentTarget.src = '/logo.jpeg';
  }, []);

  const currentQuantity = parseInt(quantity) || 1;
  const isDisabled = currentQuantity <= 0 || isAddingToCart;

  return (
    <div
      className={`border rounded-lg lg:mt-2 overflow-hidden hover:shadow-md transition-shadow flex h-full ${
        gridType === 'grid3' ? 'flex-row items-stretch' : 'flex-col'
      }`}
    >
      <div
        className={`relative cursor-pointer overflow-hidden group ${
          gridType === 'grid3' 
            ? 'w-1/4 sm:w-1/8 aspect-square' 
            : 'aspect-square w-full'
        }`}
      >
        <LazyImage
          ref={imgRef}
          src={product.image || product.picture?.secure_url || '/logo.jpeg'}
          alt={product.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer"
          onClick={handleImageClick}
          fallback="/logo.jpeg"
          quality={85}
         
        />


        <div
          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
          onClick={handleImageClick}
          aria-label="View product image"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        </div>
      </div>

      <div
        className={`p-3 flex flex-col flex-grow ${
          gridType === 'grid3' ? 'w-3/4 sm:w-7/8' : 'w-full'
        }`}
      >
        <h3 className={`font-medium line-clamp-2 leading-tight ${
          gridType === 'grid3' ? 'text-sm' : 'text-xs'
        }`}>
          {searchTerm ? 
            highlightSearchTerm(
              product.title.split(' ').map(word =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
              ).join(' '), 
              searchTerm
            ) : 
            product.title.split(' ').map(word =>
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' ')
          }
        </h3>
        
        
        <div className="flex-grow" />

        <div className={`flex flex-row gap-2 ${
          gridType === 'grid3' ? 'mt-3' : 'mt-2'
        }`}>
          {/* Quantity Controls - 55% mobile, 50% desktop */}
          <div className="flex items-center justify-center w-[55%] md:w-1/2">
            <div className="flex w-full items-stretch h-9 sm:h-8 bg-white/40 backdrop-blur-md shadow-md border border-white/30 rounded-full overflow-hidden">
              <button
                onClick={handleDecrease}
                onTouchStart={handleTouchStart}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  e.preventDefault(); // Prevent click event from firing after touch
                  handleDecrease(e);
                }}
                className="w-9 h-9 sm:w-8 sm:h-8 rounded-l-full flex items-center justify-center text-xs font-bold text-gray-800 transition-all duration-200 hover:bg-black/90 hover:text-white hover:shadow"
                style={{
                  touchAction: 'manipulation',
                  WebkitTouchCallout: 'none',
                  WebkitUserSelect: 'none',
                  userSelect: 'none'
                }}
                disabled={currentQuantity <= 1}
                aria-label="Decrease quantity"
              >
                −
              </button>

              <input
                type="number"
                max={product.stock}
                value={quantity === '' ? '' : quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                onFocus={(e) => e.target.select()}
                className="flex-1 min-w-6 text-center bg-transparent focus:outline-none text-xs text-black appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-moz-appearance]:textfield h-full"
              />

              <button
                onClick={handleIncrease}
                onTouchStart={handleTouchStart}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  e.preventDefault(); // Prevent click event from firing after touch
                  handleIncrease(e);
                }}
                className="w-9 h-9 sm:w-8 sm:h-8 rounded-r-full flex items-center justify-center text-xs font-bold text-gray-800 transition-all duration-200 hover:bg-black/90 hover:text-white hover:shadow"
                style={{
                  touchAction: 'manipulation',
                  WebkitTouchCallout: 'none',
                  WebkitUserSelect: 'none',
                  userSelect: 'none'
                }}
                disabled={currentQuantity >= product.stock}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          {/* Add to Cart Button - 45% mobile, 50% desktop, icon + "Add" text on mobile */}
          <button
            onClick={handleAddClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            disabled={isDisabled}
            className={`text-xs cursor-pointer px-2 md:px-3 h-9 sm:h-8 rounded-full transition-all shadow-lg backdrop-blur-md border border-white/30 flex items-center justify-center gap-1 md:gap-2 w-[45%] md:w-1/2 ${
              isInCart
                ? 'bg-black hover:bg-gray-800'
                : isDisabled
                  ? 'bg-gray-500 cursor-not-allowed'
                  : 'bg-primary hover:bg-primary/90 hover:shadow-2xl'
            } text-white`}
            style={{
              touchAction: 'manipulation',
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none'
            }}
            aria-label={isInCart ? 'Added to cart' : 'Add to cart'}
          >
            {isInCart ? (
              <>
                <svg className="w-5 h-5 md:w-3 md:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="hidden md:inline">Added to Cart</span>
              </>
            ) : isAddingToCart ? (
              <OneLoader size="small" text="Adding..." showText={false} />
            ) : (
              <>
                <svg className="w-5 h-5 md:w-3 md:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                </svg>
                <span className="inline md:hidden">Add</span>
                <span className="hidden md:inline">Add to Cart</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;

