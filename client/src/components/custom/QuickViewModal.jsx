import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Heart, Star, Minus, Plus, ShoppingCart } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import LazyImage from '../ui/LazyImage';
import { cn } from '@/lib/utils';
import { addToCart } from '@/redux/slices/cart/cartSlice';
import { addWishlistItem, removeWishlistItem, selectWishlistItems } from '@/redux/slices/wishlist/wishlistSlice';
import { selectCurrency } from '@/redux/slices/settings/settingsSlice';
import { formatCurrency } from '@/utils/currency';

const QuickViewModal = ({ product, open, onOpenChange }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const currency = useSelector(selectCurrency);
  const wishlistItems = useSelector(selectWishlistItems);
  const { user } = useSelector((state) => state.auth);

  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  useEffect(() => {
    if (open) setQuantity(1);
  }, [open, product?._id]);

  if (!product) return null;

  const salePrice = Number(product?.salePrice ?? product?.price ?? 0);
  const originalPrice = Number(product?.price ?? product?.compareAtPrice ?? 0);
  const hasDiscount = originalPrice > salePrice && originalPrice > 0 && salePrice > 0;
  const stock = Number(product?.stock) || 0;
  const isOutOfStock = stock <= 0;
  const ratingAverage = Number(product?.ratingAverage) || 0;
  const ratingCount = Number(product?.ratingCount) || 0;
  const hasRating = ratingCount > 0 && ratingAverage > 0;

  const wishlistKey = product?._id || product?.id;
  const isWishlisted = wishlistItems.some((item) => {
    const entryId = item.product?._id || item.productId || item.product;
    return entryId && String(entryId) === String(wishlistKey);
  });

  const handleAddToCart = async () => {
    if (isOutOfStock) return;
    setIsAdding(true);
    try {
      await dispatch(addToCart({ productId: product._id, quantity })).unwrap();
      toast.success('Product added to cart');
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Failed to add to cart');
    } finally {
      setIsAdding(false);
    }
  };

  const handleWishlistToggle = async () => {
    if (!wishlistKey || wishlistLoading) return;
    if (!user) {
      toast.warning('Please log in to manage your wishlist.');
      return;
    }
    setWishlistLoading(true);
    try {
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
  };

  const handleViewDetails = () => {
    onOpenChange(false);
    navigate(`/product/${product.slug || product._id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="grid sm:grid-cols-2">
          <div className="aspect-square bg-latte-soft">
            <LazyImage
              src={product.image || product.picture?.secure_url || product.primaryImage || '/logo.svg'}
              alt={product.title}
              className="h-full w-full object-cover"
              fallback="/logo.svg"
            />
          </div>

          <div className="flex flex-col gap-3 p-5 sm:p-6">
            <DialogTitle className="text-lg leading-snug">
              {product?.title?.toUpperCase() ?? 'UNTITLED PRODUCT'}
            </DialogTitle>

            {hasRating && (
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-caramel text-caramel" />
                <span className="text-xs font-semibold text-espresso">{ratingAverage.toFixed(1)}</span>
                <span className="text-[11px] text-mocha/60">({ratingCount})</span>
              </div>
            )}

            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-espresso">{formatCurrency(salePrice, currency)}</span>
              {hasDiscount && (
                <span className="text-sm text-mocha/60 line-through">{formatCurrency(originalPrice, currency)}</span>
              )}
            </div>

            {product.description && (
              <p className="text-sm text-mocha line-clamp-3">{product.description}</p>
            )}

            {isOutOfStock ? (
              <div className="mt-2 rounded-full bg-muted px-3 py-1.5 text-center text-xs font-medium text-mocha">
                Currently unavailable online
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-3">
                <div className="flex items-center rounded-full border border-latte">
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center text-mocha hover:text-espresso"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold text-espresso">{quantity}</span>
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center text-mocha hover:text-espresso"
                    onClick={() => setQuantity((q) => Math.min(stock || 999, q + 1))}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Button onClick={handleAddToCart} disabled={isAdding} className="flex-1">
                  <ShoppingCart className="h-4 w-4" />
                  {isAdding ? 'Adding...' : 'Add to cart'}
                </Button>
              </div>
            )}

            <div className="mt-1 flex items-center gap-4">
              <button
                type="button"
                onClick={handleWishlistToggle}
                disabled={wishlistLoading}
                className="flex items-center gap-1.5 text-sm font-medium text-mocha transition-colors hover:text-espresso"
              >
                <Heart className={cn('h-4 w-4', isWishlisted && 'fill-destructive text-destructive')} />
                {isWishlisted ? 'Saved' : 'Save for later'}
              </button>
              <button
                type="button"
                onClick={handleViewDetails}
                className="text-sm font-semibold text-espresso underline underline-offset-2 hover:text-caramel-deep"
              >
                View full details
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickViewModal;
