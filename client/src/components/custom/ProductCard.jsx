import React, { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import LazyImage from '../ui/LazyImage';
import { Badge } from '../ui/badge';
import { highlightSearchTerm } from '@/utils/searchHighlight.jsx';
import { cn } from '@/lib/utils';
import OneLoader from '../ui/OneLoader';
import { Heart, Star, Tag, Eye, ShoppingBag } from 'lucide-react';
import { addToCart } from '@/redux/slices/cart/cartSlice';
import { addWishlistItem, removeWishlistItem, selectWishlistItems } from '@/redux/slices/wishlist/wishlistSlice';
import { selectCurrency } from '@/redux/slices/settings/settingsSlice';
import { formatCurrency } from '@/utils/currency';
import QuickViewModal from './QuickViewModal';

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
  showCartControls = true,
  showQuickAdd = false
}) => {
  const imgRef = useRef(null);
  const clickAudioRef = useRef(null);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistBurst, setWishlistBurst] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [quickAdding, setQuickAdding] = useState(false);
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
  const isLowStock = stockCount > 0 && stockCount < 5;

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
    const formatted = product?.title ?? 'Untitled product';
    return searchTerm ? highlightSearchTerm(formatted, searchTerm) : formatted;
  }, [product?.title, searchTerm]);

  const cardClass = cn(
    'group relative flex h-full bg-card rounded-2xl border border-latte overflow-hidden transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-brand/30 hover:shadow-[0_20px_36px_-20px_rgba(91,79,245,0.45)] active:translate-y-0 active:duration-100 cursor-pointer',
    gridType === 'grid3' ? 'flex-row items-stretch' : 'flex-col w-full'
  );

  const mediaWrapperClass = cn(
    'relative overflow-hidden bg-latte-soft',
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
          setWishlistBurst(true);
          setTimeout(() => setWishlistBurst(false), 600);
        }
      } catch (error) {
        toast.error(typeof error === 'string' ? error : 'Unable to update wishlist right now.');
      } finally {
        setWishlistLoading(false);
      }
    },
    [dispatch, isWishlisted, user, wishlistKey, wishlistLoading]
  );

  // Self-contained add for rails that don't pass their own cart handler.
  const handleQuickAdd = useCallback(
    async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!wishlistKey || quickAdding) return;
      try {
        setQuickAdding(true);
        await dispatch(addToCart({ productId: wishlistKey, quantity: 1 })).unwrap();
        toast.success('Product added to cart');
      } catch (error) {
        toast.error(typeof error === 'string' ? error : 'Unable to add to cart right now.');
      } finally {
        setQuickAdding(false);
      }
    },
    [dispatch, quickAdding, wishlistKey]
  );

  const handleQuickView = useCallback((event) => {
    event.stopPropagation();
    setQuickViewOpen(true);
  }, []);

  return (
    <div className={cardClass} onClick={handleProductNavigate}>
      {/* Product Image */}
      <div className={mediaWrapperClass}>
        <LazyImage
          ref={imgRef}
          src={product.image || product.picture?.secure_url || '/logo.svg'}
          alt={product.title}
          className={cn(
            'h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.035]',
            gridType === 'grid2' && 'object-contain bg-card'
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
          <div className="absolute inset-0 flex items-center justify-center bg-espresso/55 backdrop-blur-[2px]">
            <div className="bg-cream px-3 py-1.5 rounded-full shadow-md border border-latte">
              <span className="text-xs font-bold text-espresso tracking-[0.12em] uppercase">Out of stock</span>
            </div>
          </div>
        )}

        {/* Discount + Low Stock Badges */}
        {!isOutOfStock && (hasDiscount || isLowStock) && (
          <div className="absolute top-2.5 left-2.5 z-10 flex flex-col items-start gap-1.5">
            {hasDiscount && (
              <div className="bg-destructive text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                -{discountPercent}%
              </div>
            )}
            {isLowStock && (
              <div className="bg-espresso text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                Only {stockCount} left
              </div>
            )}
          </div>
        )}
        {/* Quick View + Wishlist actions */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleQuickView}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cream/90 backdrop-blur-sm text-mocha shadow-sm border border-latte transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-110 hover:text-espresso active:scale-90"
            aria-label="Quick view"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleWishlistToggle}
            disabled={wishlistLoading}
            className={cn(
              'relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-cream/90 backdrop-blur-sm text-mocha shadow-sm border border-latte transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-110 hover:text-espresso active:scale-90',
              wishlistLoading && 'cursor-wait opacity-70',
              isWishlisted && 'text-destructive border-destructive/30 bg-destructive/10'
            )}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
          >
            {wishlistLoading ? (
              <OneLoader size="tiny" inline />
            ) : (
              <>
                {wishlistBurst && (
                  <span className="pointer-events-none absolute inset-0 rounded-full bg-destructive/30 animate-heart-burst-ring" />
                )}
                <Heart
                  className={cn(
                    'h-4 w-4 transition-colors',
                    isWishlisted ? 'fill-destructive text-destructive' : '',
                    wishlistBurst && 'animate-heart-burst-pop'
                  )}
                />
              </>
            )}
          </button>
        </div>
      </div>

      <div className="contents" onClick={(event) => event.stopPropagation()}>
        <QuickViewModal product={product} open={quickViewOpen} onOpenChange={setQuickViewOpen} />
      </div>

      {/* Product Info */}
      <div className={bodyClass}>
        {/* Product Title */}
        <h3 className="font-display text-sm font-bold text-espresso line-clamp-1 leading-snug tracking-normal" title={product?.title}>
          {titleMarkup}
        </h3>

        {/* Price Section */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-sm font-bold text-espresso">{formattedSalePrice}</span>
            {hasDiscount && (
              <span className="text-xs text-mocha/60 line-through font-medium">{formattedOriginalPrice}</span>
            )}
          </div>
          {showQuickAdd && !showCartControls && !isOutOfStock && (
            <button
              type="button"
              onClick={handleQuickAdd}
              disabled={quickAdding}
              className={cn(
                'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-espresso text-white transition-all duration-200 hover:bg-brand active:scale-90',
                quickAdding && 'cursor-wait opacity-70'
              )}
              aria-label={`Add ${product?.title || 'product'} to cart`}
            >
              {quickAdding ? <OneLoader size="tiny" inline /> : <ShoppingBag className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* Rating */}
        {hasRating && (
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-caramel text-caramel" />
            <span className="text-xs font-semibold text-espresso">{ratingAverage.toFixed(1)}</span>
            <span className="text-[11px] text-mocha/60">({ratingCount})</span>
          </div>
        )}

        {/* Discount callout */}
        {hasDiscount && !isOutOfStock && (
          <div className="flex items-center gap-1 text-[11px] font-semibold text-caramel-deep">
            <Tag className="h-3 w-3 text-caramel-deep" />
            <span>Save {formatPrice(Math.max(originalPriceValue - salePriceValue, 0))}</span>
          </div>
        )}

        {/* Add to Cart & Quantity Section - Fixed at Bottom */}
        <div className={cn('mt-auto flex flex-col gap-3', showCartControls && 'pt-3 border-t border-latte')}>
          {showCartControls && (
            <div className="flex flex-col gap-2">
              {/* Add to Cart Button */}
              {isOutOfStock ? (
                <div className="w-full bg-muted text-mocha text-[11px] font-medium text-center px-3 py-1.5 rounded-full">
                  Check back soon
                </div>
              ) : (
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 whitespace-nowrap',
                    'bg-espresso text-white hover:bg-brand active:scale-[0.98]',
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
            <p className="text-xs text-mocha">Currently unavailable online.</p>
          )}
        </div>
      </div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;
