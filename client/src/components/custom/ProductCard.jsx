import React, { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import LazyImage from '../ui/LazyImage';
import { Badge } from '../ui/badge';
import { highlightSearchTerm } from '@/utils/searchHighlight.jsx';
import { cn } from '@/lib/utils';
import OneLoader from '../ui/OneLoader';
import { Heart, Star, Tag } from 'lucide-react';
import { addWishlistItem, removeWishlistItem, selectWishlistItems } from '@/redux/slices/wishlist/wishlistSlice';

const ProductCard = React.memo(({
  product,
  quantity,
  onQuantityChange,
  onAddToCart,
  isAddingToCart,
  isInCart,
  gridType,
  onProductClick,
  searchTerm = '',
  showCartControls = true
}) => {
  const imgRef = useRef(null);
  const clickAudioRef = useRef(null);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const dispatch = useDispatch();
  const wishlistItems = useSelector(selectWishlistItems);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    clickAudioRef.current = new Audio('/sounds/click.mp3');
    return () => {
      if (clickAudioRef.current) {
        clickAudioRef.current.pause();
        clickAudioRef.current = null;
      }
    };
  }, []);

  const handleProductNavigate = useCallback(() => {
    if (onProductClick) onProductClick(product);
  }, [onProductClick, product]);

  const handleAddClick = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();

    if (clickAudioRef.current) {
      clickAudioRef.current.currentTime = 0;
      clickAudioRef.current.play();
    }
    onAddToCart(product);
  }, [onAddToCart, product]);

  const handleTouchStart = useCallback((event) => {
    event.stopPropagation();
  }, []);

  const handleTouchEnd = useCallback((event) => {
    event.stopPropagation();
    event.preventDefault();
    handleAddClick(event);
  }, [handleAddClick]);

  const handleQuantityChange = useCallback((value) => {
    if (value === '') {
      onQuantityChange(product._id, '', product.stock);
      return;
    }
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      onQuantityChange(product._id, parsed, product.stock);
    }
  }, [onQuantityChange, product._id, product.stock]);

  const handleDecrease = useCallback((event) => {
    event.stopPropagation();
    const next = Math.max((Number.parseInt(quantity, 10) || 1) - 1, 1);
    onQuantityChange(product._id, next, product.stock);
  }, [quantity, onQuantityChange, product._id, product.stock]);

  const handleIncrease = useCallback((event) => {
    event.stopPropagation();
    const next = Math.min((Number.parseInt(quantity, 10) || 1) + 1, product.stock);
    onQuantityChange(product._id, next, product.stock);
  }, [quantity, onQuantityChange, product._id, product.stock]);

  const salePriceValue = useMemo(
    () => Number(product?.salePrice ?? product?.price ?? 0),
    [product?.salePrice, product?.price]
  );

  const originalPriceValue = useMemo(
    () => Number(product?.price ?? product?.compareAtPrice ?? 0),
    [product?.price, product?.compareAtPrice]
  );

  const hasDiscount = useMemo(() => {
    return originalPriceValue > salePriceValue && originalPriceValue > 0 && salePriceValue > 0;
  }, [originalPriceValue, salePriceValue]);

  const discountPercent = useMemo(() => {
    if (!hasDiscount) return 0;
    return Math.round(((originalPriceValue - salePriceValue) / originalPriceValue) * 100);
  }, [hasDiscount, originalPriceValue, salePriceValue]);

  const ratingAverage = Number(product?.ratingAverage) || 0;
  const ratingCount = Number(product?.ratingCount) || 0;
  const hasRating = ratingCount > 0 && ratingAverage > 0;

  const stockCount = useMemo(() => {
    const parsed = Number(product?.stock);
    return Number.isNaN(parsed) ? 0 : parsed;
  }, [product?.stock]);

  const isOutOfStock = stockCount <= 0;
  const currentQuantity = Number.parseInt(quantity, 10) || 1;

  // Format price in PKR
  const formatPrice = (price) => {
    if (!Number.isFinite(price) || price <= 0) return 'Price unavailable';
    return `Rs. ${price.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formattedSalePrice = useMemo(() => formatPrice(salePriceValue), [salePriceValue]);
  const formattedOriginalPrice = useMemo(() => formatPrice(originalPriceValue), [originalPriceValue]);

  const wishlistKey = useMemo(() => product?._id || product?.id || null, [product?._id, product?.id]);

  const isWishlisted = useMemo(() => {
    if (!wishlistKey) return false;
    return wishlistItems.some((item) => {
      const entryId = item.product?._id || item.productId || item.product;
      return entryId && String(entryId) === String(wishlistKey);
    });
  }, [wishlistItems, wishlistKey]);

  const titleMarkup = useMemo(() => {
    const formatted = product?.title?.toUpperCase() ?? 'UNTITLED PRODUCT';
    return searchTerm ? highlightSearchTerm(formatted, searchTerm) : formatted;
  }, [product?.title, searchTerm]);

  const cardClass = cn(
    'group relative flex h-full bg-white rounded-lg overflow-hidden transition-all duration-300 hover:shadow-md cursor-pointer',
    gridType === 'grid3' ? 'flex-row items-stretch' : 'flex-col w-full max-w-[168px] mx-auto'
  );

  const mediaWrapperClass = cn(
    'relative overflow-hidden bg-gray-50',
    gridType === 'grid3'
      ? 'w-36 sm:w-56 md:w-64 shrink-0 aspect-square sm:aspect-auto'
      : 'w-full max-w-[160px] mx-auto aspect-square'
  );

  const bodyClass = cn(
    'flex flex-1 flex-col gap-2 p-3',
    gridType === 'grid3' ? 'sm:p-4' : 'w-full max-w-[160px] mx-auto'
  );

  const handleWishlistToggle = useCallback(
    async (event) => {
      event.stopPropagation();
      if (!wishlistKey) return;
      if (wishlistLoading) return;
      if (!user) {
        toast.warning('Please log in to manage your wishlist.');
        return;
      }

      try {
        setWishlistLoading(true);
        if (isWishlisted) {
          const result = await dispatch(removeWishlistItem({ productId: wishlistKey })).unwrap();
          toast.success(result?.message ?? 'Removed from wishlist');
        } else {
          const result = await dispatch(addWishlistItem({ productId: wishlistKey })).unwrap();
          toast.success(result?.message ?? 'Saved to wishlist');
        }
      } catch (error) {
        toast.error(typeof error === 'string' ? error : 'Unable to update wishlist right now.');
      } finally {
        setWishlistLoading(false);
      }
    },
    [dispatch, isWishlisted, user, wishlistKey, wishlistLoading]
  );

  return (
    <div className={cardClass} onClick={handleProductNavigate}>
      {/* Product Image */}
      <div className={mediaWrapperClass}>
        <LazyImage
          ref={imgRef}
          src={product.image || product.picture?.secure_url || '/logo.svg'}
          alt={product.title}
          className={cn(
            'h-full w-full object-cover transition-transform duration-300 group-hover:scale-105',
            gridType === 'grid2' && 'object-contain bg-white'
          )}
          fallback="/logo.svg"
          quality={90}
          onClick={(event) => {
            event.stopPropagation();
            handleProductNavigate();
          }}
        />
        
        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white px-4 py-2 rounded">
              <span className="text-sm font-semibold text-gray-800">Out of stock</span>
            </div>
          </div>
        )}

        {/* Discount Badge - Bottom Left */}
        {hasDiscount && !isOutOfStock && (
          <div className="absolute bottom-3 left-3">
            <div className="bg-black rounded-full px-4 py-1.5">
              <span className="text-white text-xs font-semibold tracking-wide">-{discountPercent}% OFF</span>
            </div>
          </div>
        )}
        {/* Wishlist Icon */}
        <button
          type="button"
          onClick={handleWishlistToggle}
          disabled={wishlistLoading}
          className={cn(
            'absolute top-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow transition-colors',
            wishlistLoading && 'cursor-wait opacity-70',
            isWishlisted && 'text-red-500'
          )}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
        >
          {wishlistLoading ? (
            <OneLoader size="tiny" inline />
          ) : (
            <Heart
              className={cn(
                'h-4 w-4 transition-colors',
                isWishlisted ? 'fill-red-500 text-red-500' : ''
              )}
            />
          )}
        </button>
      </div>

      {/* Product Info */}
      <div className={bodyClass}>
        {/* Product Title */}
        <h3 className="text-xs font-bold text-gray-900 truncate leading-tight" title={product?.title}>
          {titleMarkup}
        </h3>

        {/* Price Section */}
        <div className="flex items-baseline gap-2 flex-wrap -mt-1">
          <span className="text-sm font-bold text-gray-900">{formattedSalePrice}</span>
          {hasDiscount && (
            <span className="text-xs text-gray-400 line-through">{formattedOriginalPrice}</span>
          )}
        </div>

        {/* Rating - only takes up space when the product actually has ratings */}
        {hasRating && (
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-semibold text-gray-800">{ratingAverage.toFixed(1)}</span>
            <span className="text-xs text-gray-500">({ratingCount})</span>
          </div>
        )}

        {/* Discount callout - only takes up space when the product is on sale */}
        {hasDiscount && !isOutOfStock && (
          <div className="flex items-center gap-1 text-[11px] font-semibold text-red-600">
            <Tag className="h-3 w-3 fill-red-100" />
            <span>{formatPrice(Math.max(originalPriceValue - salePriceValue, 0))} off</span>
          </div>
        )}

        {/* Add to Cart & Quantity Section - Fixed at Bottom */}
        <div className={cn('mt-auto flex flex-col gap-3', showCartControls && 'pt-3 border-t border-gray-200')}>
          {showCartControls && (
            <div className="flex flex-col gap-2">
              {/* Quantity Controls */}
              <div
                className={cn(
                  'flex h-8 w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-1',
                  isOutOfStock && 'opacity-50'
                )}
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="flex h-6 w-6 items-center justify-center rounded text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={handleDecrease}
                  disabled={currentQuantity <= 1 || isOutOfStock}
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  max={product.stock || 999}
                  value={quantity}
                  onChange={(event) => handleQuantityChange(event.target.value)}
                  className="w-7 border-0 bg-transparent text-center text-xs font-semibold text-gray-800 focus:outline-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  onClick={(event) => event.stopPropagation()}
                  disabled={isOutOfStock}
                />
                <button
                  type="button"
                  className="flex h-6 w-6 items-center justify-center rounded text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={handleIncrease}
                  disabled={currentQuantity >= (product.stock || 999) || isOutOfStock}
                >
                  +
                </button>
              </div>

              {/* Add to Cart Button */}
              {isOutOfStock ? (
                <div className="w-full bg-gray-100 text-gray-600 text-[11px] font-medium text-center px-3 py-1.5 rounded-lg">
                  Check back soon
                </div>
              ) : (
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-center justify-center rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 whitespace-nowrap',
                    'bg-black text-white hover:bg-gray-800',
                    isAddingToCart && 'cursor-wait opacity-70'
                  )}
                  onClick={handleAddClick}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  disabled={isAddingToCart || isOutOfStock}
                >
                  {isAddingToCart ? (
                    <OneLoader size="small" showText={false} color="white" />
                  ) : (
                    'Add to cart'
                  )}
                </button>
              )}
            </div>
          )}

          {/* Status Messages */}
          {isOutOfStock && (
            <p className="text-xs text-gray-500">Currently unavailable online.</p>
          )}
        </div>
      </div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;
