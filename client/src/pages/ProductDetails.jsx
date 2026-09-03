import { useEffect, useMemo, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  getSingleProduct,
  fetchProductReviews,
  createProductReview
} from '@/redux/slices/products/productSlice';
import { addToCart } from '@/redux/slices/cart/cartSlice';
import OneLoader from '@/components/ui/OneLoader';
import { Skeleton } from '@/components/ui/skeleton';
import ProductCardSkeleton from '@/components/custom/ProductCardSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Star,
  Heart,
  ShoppingCart,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Tag,
  Truck,
  Store,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { toast } from 'sonner';
import BannerCarousel from '@/components/custom/BannerCarousel';
import { Badge } from '@/components/ui/badge';
import { addWishlistItem, removeWishlistItem, selectWishlistItems } from '@/redux/slices/wishlist/wishlistSlice';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuthDrawer } from '@/contexts/AuthDrawerContext';
import SEO from '@/components/seo/SEO';
import { selectCurrency } from '@/redux/slices/settings/settingsSlice';
import { formatCurrency, CURRENCY_ISO_MAP } from '@/utils/currency';

const ProductDetails = () => {
  const { id: identifier } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const currency = useSelector(selectCurrency);
  const { openAuthDrawer } = useAuthDrawer();

  const {
    singleProducts,
    status,
    error,
    reviews,
    reviewsStatus,
    reviewsError,
    reviewPagination,
    reviewMutationStatus
  } = useSelector((state) => state.products);
  const { items: cartItems = [] } = useSelector((state) => state.cart);
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const wishlistItems = useSelector(selectWishlistItems);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [relatedStatus, setRelatedStatus] = useState('loading');
  const [relatedError, setRelatedError] = useState(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [buyNowLoading, setBuyNowLoading] = useState(false);
  const [isMediaDialogOpen, setIsMediaDialogOpen] = useState(false);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [selectedSort, setSelectedSort] = useState('recent');

  const fulfilmentOptions = useMemo(
    () => [
      {
        key: 'delivery',
        title: 'Delivery',
        description: 'Check availability',
        icon: Truck
      },
      {
        key: 'store',
        title: 'Store purchase',
        description: 'Select store for availability',
        icon: Store
      }
    ],
    []
  );

  useEffect(() => {
    if (identifier) {
      dispatch(getSingleProduct(identifier));
    }
  }, [dispatch, identifier]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [identifier]);

  useEffect(() => {
    if (identifier) {
      dispatch(fetchProductReviews({ identifier, page: 1, limit: 10, sort: selectedSort }));
    }
  }, [dispatch, identifier, selectedSort]);

  const product = singleProducts;
  const seoDescription = useMemo(() => {
    if (product?.metaDescription) return product.metaDescription;
    if (product?.description) {
      return `${product.description}`.replace(/\s+/g, ' ').trim().slice(0, 155);
    }
    if (product?.title) {
      return `Discover ${product.title} with curated materials, flexible delivery, and Ecommerce support.`;
    }
    return 'Explore detailed specs, imagery, and reviews for curated Ecommerce products.';
  }, [product?.description, product?.metaDescription, product?.title]);

  const seoKeywords = useMemo(() => {
    const keywords = ['Ecommerce product'];
    if (product?.title) keywords.push(product.title);
    if (product?.brand) keywords.push(`${product.brand} Ecommerce`);
    if (product?.category?.name) keywords.push(`${product.category.name} collection`);
    if (Array.isArray(product?.tags)) {
      product.tags.forEach((tag) => {
        const label = typeof tag === 'string' ? tag : tag?.name;
        if (label) keywords.push(label);
      });
    }
    return Array.from(new Set(keywords));
  }, [product]);

  const baseImages = useMemo(() => {
    if (!Array.isArray(product?.images)) return [];
    return [...product.images].sort((a, b) => (a?.position ?? 0) - (b?.position ?? 0));
  }, [product?.images]);

  const primaryImage = useMemo(() => {
    if (!product) return null;
    if (product.primaryImage) return product.primaryImage;
    if (product.picture?.secure_url) return product.picture.secure_url;
    if (Array.isArray(product.images) && product.images.length > 0) {
      const primary = product.images.find((image) => image?.isPrimary);
      return primary?.secure_url || product.images[0]?.secure_url || null;
    }
    return null;
  }, [product]);

  const defaultVariation = useMemo(() => {
    if (!Array.isArray(product?.variations) || product.variations.length === 0) {
      return null;
    }
    return product.variations.find((variation) => variation?.isDefault) || product.variations[0];
  }, [product?.variations]);

  const variationAttributes = useMemo(() => {
    if (!Array.isArray(product?.variations) || product.variations.length === 0) {
      return [];
    }
    const attributeMap = new Map();
    product.variations.forEach((variation) => {
      (variation.attributes || []).forEach((attribute) => {
        if (!attribute?.name || !attribute?.value) return;
        if (!attributeMap.has(attribute.name)) {
          attributeMap.set(attribute.name, new Set());
        }
        attributeMap.get(attribute.name).add(attribute.value);
      });
    });
    return Array.from(attributeMap.entries()).map(([name, values]) => ({
      name,
      values: Array.from(values)
    }));
  }, [product?.variations]);

  useEffect(() => {
    if (!defaultVariation) {
      setSelectedOptions({});
      return;
    }
    const initial = {};
    (defaultVariation.attributes || []).forEach((attribute) => {
      if (attribute?.name && attribute?.value) {
        initial[attribute.name] = attribute.value;
      }
    });
    setSelectedOptions(initial);
  }, [defaultVariation?._id, product?._id]);

  const activeVariation = useMemo(() => {
    if (!Array.isArray(product?.variations) || product.variations.length === 0) {
      return null;
    }
    const entries = Object.entries(selectedOptions).filter(([, value]) => Boolean(value));
    if (entries.length === 0) {
      return defaultVariation;
    }
    const matched = product.variations.find((variation) => {
      const attrs = variation.attributes || [];
      return entries.every(([name, value]) =>
        attrs.some((attribute) => attribute.name === name && attribute.value === value)
      );
    });
    return matched || defaultVariation;
  }, [product?.variations, selectedOptions, defaultVariation]);

  useEffect(() => {
    setSelectedQuantity(1);
  }, [activeVariation?._id, product?._id]);

  const variationImages = useMemo(() => {
    if (!activeVariation?.images) return [];
    return [...activeVariation.images];
  }, [activeVariation?.images]);

  const fallbackImage = product?.picture?.secure_url || product?.image || '/logo.svg';

  const galleryImages = useMemo(() => {
    const images = [];
    const addImage = (src, alt) => {
      if (!src) return;
      if (images.some((image) => image.src === src)) return;
      images.push({ src, alt: alt || product?.title || 'Product image' });
    };

    baseImages.forEach((image) => addImage(image?.secure_url || image?.url, image?.alt));
    variationImages.forEach((image) => addImage(image?.secure_url || image?.url, image?.alt));
    addImage(product?.picture?.secure_url, product?.title);
    addImage(product?.image, product?.title);
    if (images.length === 0) {
      addImage(fallbackImage, product?.title);
    }
    return images;
  }, [baseImages, variationImages, product?.picture?.secure_url, product?.image, product?.title, fallbackImage]);
  const totalGalleryImages = galleryImages.length;
  const hasMultipleImages = totalGalleryImages > 1;
  const activeImage = galleryImages[activeImageIndex] || { src: fallbackImage, alt: product?.title || 'Product image' };
  const handlePrevImage = useCallback(() => {
    if (totalGalleryImages < 2) return;
    setActiveImageIndex((prev) => (prev - 1 + totalGalleryImages) % totalGalleryImages);
  }, [totalGalleryImages]);
  const handleNextImage = useCallback(() => {
    if (totalGalleryImages < 2) return;
    setActiveImageIndex((prev) => (prev + 1) % totalGalleryImages);
  }, [totalGalleryImages]);
  const handleMediaSelect = useCallback(
    (index) => {
      if (index < 0 || index >= totalGalleryImages) return;
      setActiveImageIndex(index);
      setIsMediaDialogOpen(false);
    },
    [totalGalleryImages]
  );

  const isWishlisted = useMemo(() => {
    if (!product?._id) return false;
    return wishlistItems.some((item) => {
      if (item.productId !== product._id) return false;
      if (activeVariation?._id) {
        return !item.variantId || item.variantId === activeVariation._id;
      }
      return true;
    });
  }, [wishlistItems, product?._id, activeVariation?._id]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [product?._id, activeVariation?._id, galleryImages.length]);

  const canBackorder = activeVariation?.allowBackorder ?? product?.allowBackorder ?? false;
  const availableStock = activeVariation?.stock ?? product?.stock ?? 0;
  const isOutOfStock = !canBackorder && (availableStock ?? 0) <= 0;
  const lowStock = !canBackorder && availableStock > 0 && availableStock <= (product?.lowStockThreshold || 3);
  const stockStatusColor = useMemo(() => {
    if (isOutOfStock) return 'text-black';
    if (canBackorder) return 'text-amber-600';
    return 'text-emerald-600';
  }, [isOutOfStock, canBackorder]);

  const displayPrice = activeVariation?.price ?? product?.price ?? 0;
  const compareAtPrice = activeVariation?.compareAtPrice ?? product?.compareAtPrice ?? null;
  const displaySku = activeVariation?.sku || product?.sku || product?._id;

  const productTags = useMemo(() => {
    if (!product?.tags) return [];
    return product.tags.map((tag) =>
      typeof tag === 'string' ? { _id: tag, name: tag } : tag
    );
  }, [product?.tags]);

  const productStructuredData = useMemo(() => {
    if (!product) return null;
    const structured = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title || 'Ecommerce product',
      description: seoDescription,
      sku: displaySku,
      brand: {
        '@type': 'Brand',
        name: product.brand || 'Ecommerce'
      },
      offers: {
        '@type': 'Offer',
        priceCurrency: CURRENCY_ISO_MAP[currency] || 'PKR',
        price: Number(displayPrice || 0).toFixed(2),
        availability: isOutOfStock
          ? 'https://schema.org/OutOfStock'
          : 'https://schema.org/InStock'
      }
    };

    if (primaryImage) {
      structured.image = [primaryImage];
    }

    if (typeof window !== 'undefined') {
      structured.offers.url = window.location.href;
    }

    if (product.ratingCount) {
      structured.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: Number(product.ratingAverage || 0).toFixed(1),
        reviewCount: product.ratingCount
      };
    }

    return structured;
  }, [product, displaySku, displayPrice, isOutOfStock, primaryImage, seoDescription, currency]);

  useEffect(() => {
    if (!product?._id) {
      setRelatedProducts([]);
      setRelatedStatus('idle');
      return;
    }

    let ignore = false;

    const fetchRelatedProducts = async () => {
      setRelatedStatus('loading');
      setRelatedError(null);
      try {
        const params = new URLSearchParams({
          limit: '6',
          sortBy: 'popularity',
          stockFilter: 'active'
        });
        const categoryId =
          product.category?._id ||
          product.primaryCategory?._id ||
          (Array.isArray(product.categories) && product.categories[0]?._id) ||
          product.category ||
          product.primaryCategory ||
          (Array.isArray(product.categories) && product.categories[0]);

        if (categoryId) {
          params.set('category', categoryId);
        } else if (Array.isArray(product.tags) && product.tags.length > 0) {
          const tagIds = product.tags
            .map((tag) => tag?._id || tag)
            .filter(Boolean);
          if (tagIds.length > 0) {
            params.set('tags', tagIds.join(','));
          }
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/get-products?${params.toString()}`
        );
        const data = await response.json();
        if (ignore) return;

        if (Array.isArray(data?.data)) {
          const filtered = data.data
            .filter((item) => item._id !== product._id)
            .slice(0, 6);
          setRelatedProducts(filtered);
        } else {
          setRelatedProducts([]);
        }
        setRelatedStatus('succeeded');
      } catch (err) {
        if (ignore) return;
        console.error('Failed to load related products', err);
        setRelatedError('Unable to load related products.');
        setRelatedStatus('failed');
      }
    };

    fetchRelatedProducts();

    return () => {
      ignore = true;
    };
  }, [product?._id, product?.category, product?.primaryCategory, product?.categories, product?.tags]);
  const isInCart = useMemo(() => {
    if (!product?._id) return false;
    return cartItems.some((item) => {
      const productId = item.product?._id || item.product;
      return productId === product._id;
    });
  }, [cartItems, product]);

  const userReview = useMemo(() => {
    if (!user?._id) return null;
    return (
      reviews.find((review) => {
      const reviewUserId = review.user?._id || review.user;
      return reviewUserId && reviewUserId.toString() === user._id.toString();
      }) || null
    );
  }, [reviews, user?._id]);

  const resetForm = useCallback(() => {
    setRating(0);
    setHoverRating(0);
    setTitle('');
    setComment('');
  }, []);

  const maxPurchasable = useMemo(() => {
    if (canBackorder) return 99;
    if (!availableStock || availableStock < 1) return 1;
    return Math.min(availableStock, 99);
  }, [availableStock, canBackorder]);

  const handleOptionSelect = useCallback((name, value) => {
    if (!Array.isArray(product?.variations) || product.variations.length === 0) {
      return;
    }
    const nextOptions = { ...selectedOptions, [name]: value };
    const matching = product.variations.find((variation) => {
      const attrs = variation.attributes || [];
      return attrs.some((attribute) => attribute.name === name && attribute.value === value);
    });
    if (matching) {
      const normalized = {};
      (matching.attributes || []).forEach((attribute) => {
        if (attribute?.name && attribute?.value) {
          normalized[attribute.name] = attribute.value;
        }
      });
      setSelectedOptions(normalized);
    } else {
      setSelectedOptions(nextOptions);
    }
  }, [product?.variations, selectedOptions]);

  const handleDecreaseQuantity = useCallback(() => {
    setSelectedQuantity((prev) => Math.max(1, prev - 1));
  }, []);

  const handleIncreaseQuantity = useCallback(() => {
    setSelectedQuantity((prev) => Math.min(prev + 1, maxPurchasable));
  }, [maxPurchasable]);

  const handleQuantityInput = useCallback((event) => {
    const value = Number.parseInt(event.target.value, 10);
    if (Number.isNaN(value) || value <= 0) {
      setSelectedQuantity(1);
      return;
    }
    setSelectedQuantity(Math.min(value, maxPurchasable));
  }, [maxPurchasable]);

  const handleAddToWishlist = useCallback(async () => {
    if (!product?._id) return;
    if (!user) {
      toast.warning('Please log in to manage your wishlist.');
      openAuthDrawer('login', { redirectTo: `${location.pathname}${location.search}` });
      return;
    }

    const payload = {
      productId: product._id,
      variantId: activeVariation?._id ?? undefined,
    };

    try {
      if (isWishlisted) {
        const result = await dispatch(
          removeWishlistItem({ productId: product._id, variantId: activeVariation?._id })
        ).unwrap();
        toast.success(result?.message ?? 'Removed from wishlist');
      } else {
        const result = await dispatch(addWishlistItem(payload)).unwrap();
        toast.success(result?.message ?? 'Saved to wishlist');
      }
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Unable to update wishlist right now.');
    }
  }, [product?._id, user, location.pathname, location.search, activeVariation?._id, isWishlisted, dispatch, openAuthDrawer]);

  const addItemToCartInternal = useCallback(async () => {
    if (!product?._id) return false;
    if (isOutOfStock) {
      toast.error('This product is currently out of stock.');
      return false;
    }
    const quantity = Math.max(1, Math.min(selectedQuantity, maxPurchasable));
    try {
      await dispatch(addToCart({ productId: product._id, quantity, variationId: activeVariation?._id })).unwrap();
      return true;
    } catch (err) {
      toast.error(err || 'Failed to update cart');
      return false;
    }
  }, [dispatch, product?._id, isOutOfStock, selectedQuantity, maxPurchasable, activeVariation?._id]);

  const handleAddToCart = useCallback(async () => {
    if (addingToCart) return;
    setAddingToCart(true);
    const success = await addItemToCartInternal();
    if (success) {
      toast.success('Added to cart');
    }
    setAddingToCart(false);
  }, [addItemToCartInternal, addingToCart]);

  const handleBuyNow = useCallback(async () => {
    if (buyNowLoading) return;
    setBuyNowLoading(true);
    const success = await addItemToCartInternal();
    if (success) {
      navigate('/checkout');
    }
    setBuyNowLoading(false);
  }, [addItemToCartInternal, buyNowLoading, navigate]);

  const renderStaticStars = (value) => (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, index) => {
        const starValue = index + 1;
        const active = value >= starValue - 0.25;
        return (
          <Star
            key={starValue}
            className="h-5 w-5"
            strokeWidth={1.5}
            color={active ? '#0a0a0a' : '#d4d4d4'}
            fill={active ? '#0a0a0a' : 'none'}
          />
        );
      })}
    </div>
  );

  const renderInteractiveStars = () => (
    <div className="flex items-center gap-2">
      {Array.from({ length: 5 }, (_, index) => {
        const starValue = index + 1;
        const active = starValue <= (hoverRating || rating);
        return (
          <button
            key={starValue}
            type="button"
            onMouseEnter={() => setHoverRating(starValue)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(starValue)}
            className="focus:outline-none"
            aria-label={`Rate ${starValue} star${starValue > 1 ? 's' : ''}`}
          >
            <Star
              className="h-7 w-7 transition-colors"
              strokeWidth={1.5}
              color={active ? '#0a0a0a' : '#d4d4d4'}
              fill={active ? '#0a0a0a' : 'none'}
            />
          </button>
        );
      })}
    </div>
  );

  const handleReviewSubmit = async (event) => {
    event.preventDefault();

    if (!isAuthenticated) {
      toast.error('Please log in to leave a review');
      return;
    }

    if (userReview) {
      toast.warning('You have already shared your thoughts on this product.');
      return;
    }

    if (rating < 1 || rating > 5) {
      toast.error('Please select a rating between 1 and 5');
      return;
    }

    if (!identifier) return;

    const payload = {
      identifier,
      rating,
      title: title.trim(),
      comment: comment.trim(),
    };

    try {
        await dispatch(createProductReview(payload)).unwrap();
        toast.success('Review submitted');
      resetForm();
      dispatch(fetchProductReviews({ identifier, page: 1, limit: 10, sort: selectedSort }));
    } catch (err) {
      toast.error(err || 'Unable to save review');
    }
  };

  const handleLoadMore = () => {
    if (!reviewPagination || !identifier) return;
    const nextPage = (reviewPagination.page || 1) + 1;
    if (nextPage > (reviewPagination.pages || 1)) return;
    dispatch(fetchProductReviews({ identifier, page: nextPage, limit: reviewPagination.limit || 10, sort: selectedSort }));
  };

  const reviewSubmitting = reviewMutationStatus === 'loading';
  const canLoadMore = reviewPagination && (reviewPagination.page || 1) < (reviewPagination.pages || 1);

  const seoProps = {
    title: product?.title || 'Product details',
    description: seoDescription,
    keywords: seoKeywords,
    openGraph: {
      type: 'product',
      title: product?.title || 'Product details',
      description: seoDescription,
      image: primaryImage || '/logo.jpeg'
    },
    structuredData: productStructuredData
  };

  if (status === 'loading' || !product) {
    if (error) {
      return (
        <>
          <SEO {...seoProps} />
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <p className="text-lg font-semibold text-black">Unable to load product</p>
              <p className="text-sm text-gray-500 mt-2">{error}</p>
              <Button className="mt-4" onClick={() => navigate(-1)}>
                Go back
              </Button>
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        <SEO {...seoProps} />
        <div className="max-w-6xl mx-auto px-4 py-10">
          <Skeleton className="h-4 w-16 mb-6" />

          <Skeleton className="mb-8 h-[220px] w-full rounded-2xl" />

          <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
            <div className="lg:w-[48%] xl:w-[45%]">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="order-2 flex gap-3 overflow-x-auto pb-1 sm:order-1 sm:flex-col sm:overflow-visible">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-20 flex-shrink-0 rounded-xl sm:h-24 sm:w-24" />
                  ))}
                </div>
                <Skeleton className="order-1 aspect-square w-full rounded-2xl" />
              </div>
            </div>

            <div className="space-y-8 lg:flex-1">
              <div className="space-y-4">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-40" />
              </div>

              <Skeleton className="h-10 w-40" />

              <Skeleton className="h-5 w-36" />

              <Skeleton className="h-14 w-full rounded-xl" />

              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>

              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-9 w-32 rounded-full" />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <Skeleton className="h-10 flex-1 rounded-lg" />
                <Skeleton className="h-10 flex-1 rounded-lg" />
                <Skeleton className="h-10 flex-1 rounded-lg" />
              </div>

              <Skeleton className="h-40 w-full rounded-2xl" />
            </div>
          </div>

          <section className="mt-10">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="mt-2 h-4 w-72" />
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <ProductCardSkeleton key={i} gridType="grid2" />
              ))}
            </div>
          </section>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO {...seoProps} />
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-5 space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="group inline-flex items-center gap-1.5 text-xs font-semibold text-mocha hover:text-espresso transition-colors bg-card px-3.5 py-2 rounded-full border border-latte shadow-sm active:scale-95"
      >
        <ChevronLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" /> Back
      </button>

      <BannerCarousel placement="product_page" heightClass="h-[180px] sm:h-[220px]" className="rounded-2xl overflow-hidden shadow-sm" />

      <div className="animate-rise-in flex flex-col gap-6 lg:flex-row lg:items-start bg-card p-4 sm:p-6 rounded-2xl border border-latte shadow-[0_2px_0_0_var(--latte),0_18px_44px_-22px_rgba(43,29,23,0.28)]">
        <div className="lg:w-[46%] xl:w-[44%]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            {hasMultipleImages && (
              <div className="order-2 flex gap-2 overflow-x-auto pb-1 sm:order-1 sm:flex-col sm:overflow-visible">
                {galleryImages.map((image, index) => {
                  const isActive = index === activeImageIndex;
                  return (
                    <button
                      key={`${image.src}-${index}`}
                      type="button"
                      onClick={() => setActiveImageIndex(index)}
                      className={`group flex h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-white transition-all duration-200 active:scale-95 ${
                        isActive
                          ? 'border-caramel ring-2 ring-caramel/25'
                          : 'border-latte hover:border-caramel/50'
                      }`}
                      aria-label={`Show image ${index + 1}`}
                      aria-current={isActive}
                    >
                      <img
                        src={image.src}
                        alt={image.alt}
                        className="h-full w-full object-contain p-1 transition group-hover:scale-105"
                        onError={(event) => {
                          event.currentTarget.src = '/logo.svg';
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            )}

            <div className="group relative order-1 flex-1 overflow-hidden rounded-2xl bg-white border border-latte">
              <img
                src={activeImage.src}
                alt={activeImage.alt}
                className="aspect-square w-full object-contain p-2 transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
                onError={(event) => {
                  event.currentTarget.src = '/logo.svg';
                }}
              />
              {hasMultipleImages && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevImage}
                    className="absolute left-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/80 text-white transition hover:bg-slate-900 active:scale-95 shadow-md"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">Previous image</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNextImage}
                    className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/80 text-white transition hover:bg-slate-900 active:scale-95 shadow-md"
                  >
                    <ChevronRight className="h-4 w-4" />
                    <span className="sr-only">Next image</span>
                  </button>
                  <div className="absolute bottom-2.5 left-2.5 rounded-md bg-slate-900/80 px-2 py-0.5 text-[10px] font-bold text-white tracking-wider">
                    {activeImageIndex + 1} / {totalGalleryImages}
                  </div>
                  <div className="absolute bottom-2.5 right-2.5">
                    <Dialog open={isMediaDialogOpen} onOpenChange={setIsMediaDialogOpen}>
                      <DialogTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900/80 px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-slate-900 active:scale-95 shadow-sm"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                          View media
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-3xl">
                        <DialogHeader>
                          <DialogTitle>Product media</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-3 sm:grid-cols-3">
                          {galleryImages.map((image, index) => {
                            const isActive = index === activeImageIndex;
                            return (
                              <button
                                key={`${image.src}-${index}`}
                                type="button"
                                onClick={() => handleMediaSelect(index)}
                                className={`group relative overflow-hidden rounded-xl border transition ${
                                  isActive
                                    ? 'border-slate-900 ring-2 ring-slate-900/20 shadow-md'
                                    : 'border-slate-200 hover:border-slate-400'
                                }`}
                              >
                                <img
                                  src={image.src}
                                  alt={image.alt}
                                  className="h-32 w-full object-contain bg-white p-2"
                                  onError={(event) => {
                                    event.currentTarget.src = '/logo.svg';
                                  }}
                                />
                                {isActive && (
                                  <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-bold uppercase tracking-wider text-white">
                                    Selected
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 lg:flex-1">
          <div className="space-y-2">
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-espresso leading-[1.1] tracking-tight">{product.title}</h1>
            <div className="flex items-center gap-2 text-xs text-mocha">
              {renderStaticStars(product.ratingAverage || 0)}
              <span className="font-bold text-espresso">
                {(product.ratingAverage || 0).toFixed(1)}
              </span>
              <span>
                ({product.ratingCount || 0} review{(product.ratingCount || 0) === 1 ? '' : 's'})
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-baseline gap-2.5 pb-3 border-b border-latte">
            <p className="font-display text-4xl sm:text-5xl font-semibold text-espresso tracking-tight">{formatCurrency(displayPrice, currency)}</p>
            {compareAtPrice && compareAtPrice > displayPrice && (
              <p className="text-sm font-semibold text-mocha/60 line-through">
                {formatCurrency(compareAtPrice, currency)}
              </p>
            )}
            {product.isOnSale && (
              <Badge className="rounded-full bg-caramel/20 border border-caramel/40 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-caramel-deep">On sale</Badge>
            )}
          </div>

          <div className={`flex items-center gap-2 text-xs font-bold ${stockStatusColor}`}>
            {isOutOfStock ? <AlertTriangle size={15} /> : <CheckCircle size={15} />}
            <span>
              {isOutOfStock
                ? 'Out of stock'
                : canBackorder
                  ? 'Available on backorder'
                  : lowStock
                    ? `Low stock — only ${availableStock} left`
                    : 'In stock & ready to ship'}
            </span>
          </div>

          {(product.description || activeVariation?.description) && (
            <div className="space-y-1.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Overview</h2>
              <p className="text-xs sm:text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">
                {activeVariation?.description || product.description}
              </p>
            </div>
          )}

          {variationAttributes.length > 0 && (
            <div className="space-y-3 pt-1">
              {variationAttributes.map(({ name, values }) => (
                <div key={name} className="space-y-1.5">
                  <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">{name}</p>
                  <div className="flex flex-wrap gap-2">
                    {values.map((value) => {
                      const isSelected = selectedOptions[name] === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => handleOptionSelect(name, value)}
                          className={`rounded-full border px-4 py-1.5 text-xs font-bold transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 ${
                            isSelected
                              ? 'border-espresso bg-espresso text-cream shadow-[0_3px_0_0_var(--caramel-deep)]'
                              : 'border-latte bg-latte-soft text-mocha hover:border-caramel hover:text-espresso'
                          }`}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Quantity</p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center rounded-full border border-latte bg-latte-soft overflow-hidden">
                <button
                  type="button"
                  onClick={handleDecreaseQuantity}
                  className="h-9 w-9 text-base font-bold text-mocha transition-colors duration-200 hover:bg-caramel hover:text-espresso active:scale-90 disabled:opacity-40"
                  disabled={selectedQuantity <= 1}
                >
                  −
                </button>
                <input
                  type="number"
                  value={selectedQuantity}
                  min={1}
                  max={maxPurchasable}
                  onChange={handleQuantityInput}
                  className="h-9 w-12 border-l border-r border-latte bg-transparent text-center text-xs font-bold text-espresso focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleIncreaseQuantity}
                  className="h-9 w-9 text-base font-bold text-mocha transition-colors duration-200 hover:bg-caramel hover:text-espresso active:scale-90 disabled:opacity-40"
                  disabled={selectedQuantity >= maxPurchasable}
                >
                  +
                </button>
              </div>
              {!canBackorder && availableStock > 0 && (
                <span className="text-xs font-medium text-slate-500">
                  {lowStock ? `Hurry, only ${availableStock} left!` : `${availableStock} available`}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2.5 pt-2 sm:flex-row sm:items-center">
            <div className="flex gap-2.5 sm:contents">
              <Button
                type="button"
                size="lg"
                className="flex-1 btn-3d bg-espresso text-cream font-semibold tracking-wide hover:bg-espresso-soft sm:flex-1"
                onClick={handleAddToCart}
                disabled={isOutOfStock || addingToCart || isInCart}
              >
                {addingToCart ? (
                  <span className="flex items-center gap-2 text-xs">
                    <OneLoader size="tiny" inline />
                    Adding…
                  </span>
                ) : isInCart ? (
                  'Already in cart'
                ) : (
                  <span className="flex items-center justify-center gap-2 text-xs">
                    <ShoppingCart size={16} />
                    Add to Cart
                  </span>
                )}
              </Button>
              <Button
                variant="outline"
                type="button"
                size="lg"
                aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                className={`w-12 shrink-0 px-0 border-latte font-semibold press sm:w-auto sm:flex-1 sm:px-5 ${
                  isWishlisted ? 'border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15' : 'text-mocha hover:bg-latte-soft hover:text-espresso'
                }`}
                onClick={handleAddToWishlist}
              >
                <span className="flex items-center justify-center gap-1.5 text-xs">
                  <Heart size={16} className={isWishlisted ? 'text-destructive' : 'text-mocha'} fill={isWishlisted ? 'currentColor' : 'none'} />
                  <span className="hidden sm:inline">{isWishlisted ? 'Saved' : 'Wishlist'}</span>
                </span>
              </Button>
            </div>
            <Button
              type="button"
              size="lg"
              className="w-full btn-3d bg-caramel text-espresso font-semibold tracking-wide hover:bg-caramel-deep hover:text-cream sm:flex-1"
              onClick={handleBuyNow}
              disabled={isOutOfStock || buyNowLoading}
            >
              {buyNowLoading ? (
                <span className="flex items-center gap-2 text-xs">
                  <OneLoader size="tiny" inline />
                  Processing…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5 text-xs">
                  <ArrowRight size={16} />
                  Buy Now
                </span>
              )}
            </Button>
          </div>

          {productTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 pt-1">
              <Tag size={13} className="text-slate-400" />
              {productTags.map((tag) => (
                <Badge key={tag._id} className="bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold">
                  #{tag.name}
                </Badge>
              ))}
            </div>
          )}

          <div className="space-y-3 rounded-2xl border border-latte bg-latte-soft/60 p-4 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-caramel-deep">Fulfillment &amp; Delivery</h2>
            <div className="space-y-2">
              {fulfilmentOptions.map(({ key, title, description, icon: Icon }) => (
                <div
                  key={key}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-slate-400"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>
                      <p className="text-xs font-bold text-slate-900">{title}</p>
                      <p className="text-[11px] text-slate-500">{description}</p>
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-semibold text-espresso">Related Products</h2>
            <p className="text-xs text-mocha">Hand-picked matching designs.</p>
          </div>
        </div>

        {relatedStatus === 'loading' ? (
          <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProductCardSkeleton key={i} gridType="grid2" />
            ))}
          </div>
        ) : relatedError ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
            {relatedError}
          </div>
        ) : relatedProducts.length === 0 ? (
          <p className="text-xs text-slate-500">
            We couldn’t find similar products right now.
          </p>
        ) : (
          <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {relatedProducts.map((related) => (
              <button
                key={related._id}
                type="button"
                onClick={() => navigate(`/product/${related.slug || related._id}`)}
                className="group flex flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white text-left shadow-[0_2px_0_0_var(--latte)] transition-all duration-150 hover:-translate-y-1 hover:border-caramel/50 hover:shadow-[0_5px_0_0_var(--caramel)] active:translate-y-0"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-slate-50 p-2">
                  <img
                    src={
                      related.picture?.secure_url ||
                      related.image ||
                      related.images?.[0]?.secure_url ||
                      '/logo.svg'
                    }
                    alt={related.title}
                    className="h-full w-full object-contain transition duration-200 group-hover:scale-105"
                    onError={(event) => {
                      event.currentTarget.src = '/logo.svg';
                    }}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1 p-2.5 sm:p-3">
                  <h3 className="line-clamp-1 text-xs font-semibold text-slate-900">
                    {related.title}
                  </h3>
                  <p className="text-xs font-bold text-slate-900">
                    {formatCurrency(related.price || 0, currency)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {product.additionalInfo && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_0_0_var(--latte)] p-4 sm:p-5">
          <h2 className="font-display text-base font-semibold text-espresso mb-2">Product Specifications</h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
            {product.additionalInfo}
          </p>
        </div>
      )}

      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_0_0_var(--latte)] p-4 sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="lg:w-1/3 space-y-3">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-semibold text-espresso">Customer Reviews</h2>
              <p className="text-xs text-mocha">Real feedback from verified shoppers.</p>
            </div>
            <div className="flex items-center gap-3">
              {renderStaticStars(product.ratingAverage || 0)}
              <span className="text-2xl font-semibold text-gray-900">
                {(product.ratingAverage || 0).toFixed(1)}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Based on {product.ratingCount || 0} review{(product.ratingCount || 0) === 1 ? '' : 's'}
            </p>
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Sort reviews</label>
              <select
                value={selectedSort}
                onChange={(event) => setSelectedSort(event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="recent">Most recent</option>
                <option value="oldest">Oldest</option>
                <option value="highest">Rating: high to low</option>
                <option value="lowest">Rating: low to high</option>
              </select>
            </div>
          </div>

          <div className="flex-1 space-y-8">
            {isAuthenticated ? (
              userReview ? (
              <div className="border border-gray-100 rounded-xl p-5 bg-gray-50/60">
                  <h3 className="text-lg font-semibold text-gray-900">Thanks for sharing!</h3>
                  <p className="text-sm text-gray-600">
                    You’ve already reviewed this product. If you need further assistance, please contact our support team.
                  </p>
                </div>
              ) : (
                <div className="border border-gray-100 rounded-xl p-5 bg-gray-50/60">
                  <h3 className="text-lg font-semibold text-gray-900">Write a review</h3>
                <form className="space-y-4" onSubmit={handleReviewSubmit}>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Overall rating</label>
                    {renderInteractiveStars()}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Headline (optional)</label>
                    <Input
                      placeholder="Summarise your experience"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Your review</label>
                    <Textarea
                      placeholder="What did you love or wish was different?"
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                      <Button
                        type="submit"
                        className="bg-black text-white hover:bg-black/90"
                        disabled={reviewSubmitting}
                      >
                      {reviewSubmitting ? (
                        <span className="flex items-center gap-2">
                          <OneLoader size="tiny" inline />
                          Saving
                        </span>
                      ) : (
                        'Submit review'
                      )}
                    </Button>
                  </div>
                </form>
              </div>
              )
            ) : (
              <div className="border border-dashed border-gray-200 rounded-xl p-6 text-center bg-gray-50/60">
                <p className="text-gray-700 font-medium">Want to share your experience?</p>
                <p className="text-sm text-gray-500 mb-4">Log in to rate and review this product.</p>
                <Button
                  onClick={() =>
                    openAuthDrawer('login', { redirectTo: `${location.pathname}${location.search}` })
                  }
                  className="bg-black text-white hover:bg-black/90"
                >
                  Sign in to review
                </Button>
              </div>
            )}

            {reviewsStatus === 'loading' ? (
              <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-5 space-y-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {reviewsError && (
                  <div className="rounded-lg border border-black/20 bg-black/5 px-4 py-3 text-sm text-black">
                    {reviewsError}
                  </div>
                )}

                {reviews.length === 0 && !reviewsError ? (
                  <p className="text-sm text-gray-500 text-center py-6">No reviews yet. Be the first to share your thoughts!</p>
                ) : (
                  reviews.map((review) => {
                    const reviewUserId = review.user?._id || review.user;
                    const isOwner = user?._id && reviewUserId && reviewUserId.toString() === user._id.toString();
                    return (
                      <div key={review._id} className="border border-gray-100 rounded-xl p-5">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              {renderStaticStars(review.rating || 0)}
                              <span className="text-xs text-gray-500">
                                {new Date(review.createdAt).toLocaleDateString()}
                                {review.isEdited ? ' • Edited' : ''}
                              </span>
                            </div>
                            <p className="mt-2 text-sm font-semibold text-gray-900">
                              {review.title || 'No headline'}
                            </p>
                            <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
                              {review.comment || 'No additional comments provided.'}
                            </p>
                            {review.adminResponse?.message && (
                              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                                <p className="text-xs font-semibold uppercase text-gray-500 tracking-wide">
                                  Store reply
                                </p>
                                <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                                  {review.adminResponse.message}
                                </p>
                                <p className="mt-2 text-xs text-gray-400">
                                  {review.adminResponse.respondedBy?.name
                                    ? `Responded by ${review.adminResponse.respondedBy.name}`
                                    : 'Responded by store team'}{' '}
                                  {review.adminResponse.respondedAt
                                    ? `on ${new Date(review.adminResponse.respondedAt).toLocaleDateString()}`
                                    : ''}
                                </p>
                              </div>
                            )}
                            <p className="mt-3 text-xs text-gray-500">
                              Review by <span className="font-medium">{review.user?.name || 'Anonymous'}</span>
                            </p>
                          </div>

                          {isOwner && (
                            <Badge variant="secondary" className="mt-3">
                              Your review
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {canLoadMore && (
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      onClick={handleLoadMore}
                      disabled={reviewsStatus === 'loadingMore'}
                      className="flex items-center gap-2"
                    >
                      {reviewsStatus === 'loadingMore' ? (
                        <>
                          <OneLoader size="tiny" inline /> Loading more
                        </>
                      ) : (
                        'Load more reviews'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
      </div>
    </>
  );
};

export default ProductDetails;

