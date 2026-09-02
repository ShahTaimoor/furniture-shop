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
import { selectCurrency } from '@/redux/slices/settings/settingsSlice';
import { formatCurrency } from '@/utils/currency';

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
  const currency = useSelector(selectCurrency);

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

  const formatPrice = (price) => {
    if (!Number.isFinite(price) || price <= 0) return 'Price unavailable';
    return formatCurrency(price, currency);
  };

  const formattedSalePrice = useMemo(() => formatPrice(salePriceValue), [salePriceValue, currency]);
  const formattedOriginalPrice = useMemo(() => formatPrice(originalPriceValue), [originalPriceValue, currency]);

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
    'group relative flex h-full bg-white rounded-xl border border-slate-200/90 shadow-[0_2px_0_0_#e2e8f0,0_3px_6px_-1px_rgba(0,0,0,0.04)] overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_6px_0_0_#cbd5e1,0_10px_16px_-2px_rgba(0,0,0,0.07)] active:translate-y-0 active:shadow-[0_1px_0_0_#e2e8f0] cursor-pointer',
    gridType === 'grid3' ? 'flex-row items-stretch' : 'flex-col w-full'
  );

  const mediaWrapperClass = cn(
    'relative overflow-hidden bg-slate-50/80',
    gridType === 'grid3'
      ? 'w-32 sm:w-48 md:w-56 shrink-0 aspect-square sm:aspect-auto'
      : 'w-full aspect-square'
  );

  const bodyClass = cn(
    'flex flex-1 flex-col gap-1.5 p-2.5 sm:p-3',
    gridType === 'grid3' && 'sm:p-3.5'
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
            gridType === 'grid2' && 'object-contain bg-white p-2'
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
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[1px]">
            <div className="bg-white px-3 py-1.5 rounded-lg shadow-md border border-slate-200">
              <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">Out of stock</span>
            </div>
          </div>
        )}

        {/* Discount Badge - Solid 3D Pill */}
        {hasDiscount && !isOutOfStock && (
          <div className="absolute top-2 left-2 z-10">
            <div className="bg-slate-900 text-white text-[11px] font-bold tracking-wider px-2 py-0.5 rounded-md shadow-sm border border-slate-700">
              -{discountPercent}%
            </div>
          </div>
        )}
        {/* Wishlist Icon with 3D tactile push */}
        <button
          type="button"
          onClick={handleWishlistToggle}
          disabled={wishlistLoading}
          className={cn(
            'absolute top-2 right-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm border border-slate-200 transition-all duration-150 hover:scale-110 active:scale-95 active:shadow-none',
            wishlistLoading && 'cursor-wait opacity-70',
            isWishlisted && 'text-red-500 border-red-200 bg-red-50/50'
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
        <h3 className="text-xs font-semibold text-slate-900 line-clamp-1 leading-snug" title={product?.title}>
          {titleMarkup}
        </h3>

        {/* Price Section */}
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-sm font-bold text-slate-900">{formattedSalePrice}</span>
          {hasDiscount && (
            <span className="text-xs text-slate-400 line-through font-medium">{formattedOriginalPrice}</span>
          )}
        </div>

        {/* Rating */}
        {hasRating && (
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="text-xs font-semibold text-slate-800">{ratingAverage.toFixed(1)}</span>
            <span className="text-[11px] text-slate-400">({ratingCount})</span>
          </div>
        )}

        {/* Discount callout */}
        {hasDiscount && !isOutOfStock && (
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
            <Tag className="h-3 w-3 text-emerald-600" />
            <span>Save {formatPrice(Math.max(originalPriceValue - salePriceValue, 0))}</span>
          </div>
        )}

        {/* Add to Cart & Quantity Section - Fixed at Bottom */}
        <div className={cn('mt-auto flex flex-col gap-3', showCartControls && 'pt-3 border-t border-gray-200')}>
          {showCartControls && (
            <div className="flex flex-col gap-2">
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
