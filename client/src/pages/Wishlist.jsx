import { useEffect, useMemo, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { removeWishlistItem, clearWishlistItems, selectWishlistItems, fetchWishlist } from '@/redux/slices/wishlist/wishlistSlice';
import { addToCart } from '@/redux/slices/cart/cartSlice';
import { toast } from 'sonner';
import OneLoader from '@/components/ui/OneLoader';
import SEO from '@/components/seo/SEO';

const formatCurrency = (value, currency = 'GBP', locale = 'en-GB') => {
  if (typeof value !== 'number') return null;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  } catch (error) {
    console.warn('Failed to format currency', error);
    return `£${value}`;
  }
};

const deriveProductPath = (item) => {
  if (item.path) return item.path;
  if (item.slug) return `/product/${item.slug}`;
  return `/product/${item.productId}`;
};

const Wishlist = () => {
  const dispatch = useDispatch();
  const wishlistItems = useSelector(selectWishlistItems);
  const { status: wishlistStatus, error: wishlistError } = useSelector((state) => state.wishlist);
  const { user } = useSelector((state) => state.auth);
  const [movingItemKey, setMovingItemKey] = useState(null);
  const itemCount = wishlistItems.length;

  const totalPotential = useMemo(() => {
    return wishlistItems.reduce((sum, item) => {
      const price = typeof item.salePrice === 'number' ? item.salePrice : item.price;
      if (typeof price === 'number') {
        return sum + price;
      }
      return sum;
    }, 0);
  }, [wishlistItems]);

  const handleRemove = async (productId, variantId) => {
    try {
      const result = await dispatch(removeWishlistItem({ productId, variantId })).unwrap();
      toast.success(result?.message ?? 'Removed from wishlist');
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Unable to remove product right now.');
    }
  };

  const createWishlistKey = useCallback((item) => {
    if (!item) return null;
    return item.variantId ? `${item.productId}:${item.variantId}` : `${item.productId}`;
  }, []);

  const handleMoveToCart = useCallback(
    async (item) => {
      if (!item?.productId) {
        toast.error('Missing product information.');
        return;
      }

      if (!user) {
        toast.warning('Please log in to continue.');
        return;
      }

      const key = createWishlistKey(item);
      setMovingItemKey(key);

      try {
        await dispatch(addToCart({ productId: item.productId, quantity: 1 })).unwrap();
        await dispatch(
          removeWishlistItem({ productId: item.productId, variantId: item.variantId ?? undefined })
        ).unwrap();
        toast.success('Moved to cart');
      } catch (error) {
        toast.error(typeof error === 'string' ? error : 'Unable to move to cart right now.');
      } finally {
        setMovingItemKey(null);
      }
    },
    [dispatch, user, createWishlistKey]
  );

  const handleClear = async () => {
    if (itemCount === 0) return;
    try {
      const result = await dispatch(clearWishlistItems()).unwrap();
      toast.success(result?.message ?? 'Wishlist cleared');
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Unable to clear wishlist right now.');
    }
  };

  useEffect(() => {
    if (user && wishlistStatus === 'idle') {
      dispatch(fetchWishlist());
    }
  }, [dispatch, user, wishlistStatus]);

  const seoElement = (
    <SEO
      title="Wishlist"
      description="Save your favourite FURNITURE products for later and quickly move them to cart when you're ready."
      keywords={['wishlist', 'saved products', 'FURNITURE account']}
      noIndex
    />
  );

  if (wishlistStatus === 'loading' && itemCount === 0) {
    return (
      <>
        {seoElement}
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <OneLoader size="medium" text="Loading wishlist..." />
        </div>
      </>
    );
  }

  if (itemCount === 0) {
    return (
      <>
        {seoElement}
        <div className="mx-auto flex min-h-[60vh] max-w-4xl flex-col items-center justify-center gap-6 px-4 py-16 text-center">
        <Heart size={56} className="text-primary" />
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-slate-900">Your wishlist is empty</h1>
          <p className="text-sm text-slate-600">
            Save products you love and we’ll keep them safe here. Browse the latest arrivals to get started.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/products" className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:bg-primary/90">
            Start shopping
          </Link>
          <Link to="/products/new" className="inline-flex items-center rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            Discover new in-store
          </Link>
        </div>
        </div>
      </>
    );
  }

  return (
    <>
      {seoElement}
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-slate-900">Wishlist</h1>
            <p className="text-sm text-slate-600">
              {itemCount === 1 ? '1 saved product' : `${itemCount} saved products`}
              {totalPotential > 0 && ` · ${formatCurrency(totalPotential) ?? ''} potential spend`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/cart" className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              <ShoppingCart size={16} />
              View cart
            </Link>
            <Button variant="outline" size="sm" onClick={handleClear} disabled={wishlistStatus === 'loading'}>
              Clear wishlist
            </Button>
          </div>
        </div>

        {wishlistError && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {wishlistError}
          </div>
        )}

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {wishlistItems.map((item) => {
            const productUrl = deriveProductPath(item);
            const displayPrice = formatCurrency(
              typeof item.salePrice === 'number' ? item.salePrice : item.price,
              item.currency ?? 'GBP'
            );
            const compareAt = typeof item.salePrice === 'number' ? formatCurrency(item.price, item.currency ?? 'GBP') : null;
            return (
              <div key={`${item.productId}-${item.variantId ?? 'default'}`} className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-lg">
                <Link to={productUrl} className="relative block aspect-square bg-slate-50">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">No image</div>
                  )}
                  <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow">
                    Saved for later
                  </div>
                </Link>

                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex flex-col gap-1">
                    <Link to={productUrl} className="text-base font-semibold text-slate-900 hover:text-primary">
                      {item.title}
                    </Link>
                    {item.stockStatus && (
                      <span className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                        {item.stockStatus.replace(/-/g, ' ')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-2">
                    {displayPrice && <span className="text-lg font-semibold text-slate-900">{displayPrice}</span>}
                    {compareAt && (
                      <span className="text-sm font-medium text-slate-400 line-through">{compareAt}</span>
                    )}
                  </div>

                  <div className="mt-auto flex items-center gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => handleMoveToCart(item)}
                      disabled={wishlistStatus === 'loading' || movingItemKey === createWishlistKey(item)}
                    >
                      <ShoppingCart size={16} className="mr-2" />
                      {movingItemKey === createWishlistKey(item) ? 'Moving...' : 'Move to cart'}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="border-red-200 text-red-500 hover:bg-red-50"
                      onClick={() => handleRemove(item.productId, item.variantId)}
                      disabled={wishlistStatus === 'loading'}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default Wishlist;

