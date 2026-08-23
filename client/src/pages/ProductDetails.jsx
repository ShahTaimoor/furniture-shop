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

const ProductDetails = () => {
  const { id: identifier } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
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
    if (product?.brand) keywords.push(`${product.brand} furniture`);
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
        priceCurrency: product.currency || 'GBP',
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
  }, [product, displaySku, displayPrice, isOutOfStock, primaryImage, seoDescription]);

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
      <div className="max-w-6xl mx-auto px-4 py-10">
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-gray-600 hover:text-gray-900 transition-colors mb-6"
      >
        ← Back
      </button>

      <BannerCarousel placement="product_page" heightClass="h-[220px]" className="mb-8" />

      <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
        <div className="lg:w-[48%] xl:w-[45%]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            {hasMultipleImages && (
              <div className="order-2 flex gap-3 overflow-x-auto pb-1 sm:order-1 sm:flex-col sm:overflow-visible">
                {galleryImages.map((image, index) => {
                  const isActive = index === activeImageIndex;
                  return (
                    <button
                      key={`${image.src}-${index}`}
                      type="button"
                      onClick={() => setActiveImageIndex(index)}
                      className={`group flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                        isActive
                          ? 'border-black ring-2 ring-black/20'
                          : 'border-transparent hover:border-gray-300'
                      } sm:h-24 sm:w-24`}
                      aria-label={`Show image ${index + 1}`}
                      aria-current={isActive}
                    >
                      <img
                        src={image.src}
                        alt={image.alt}
                        className="h-full w-full object-contain transition group-hover:scale-[1.03]"
                        onError={(event) => {
                          event.currentTarget.src = '/logo.svg';
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            )}

            <div className="relative order-1 flex-1 overflow-hidden rounded-2xl bg-white">
              <img
                src={activeImage.src}
                alt={activeImage.alt}
                className="aspect-square w-full object-cover"
                onError={(event) => {
                  event.currentTarget.src = '/logo.svg';
                }}
              />
              {hasMultipleImages && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevImage}
                    className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <ChevronLeft className="h-5 w-5" />
                    <span className="sr-only">Previous image</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNextImage}
                    className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <ChevronRight className="h-5 w-5" />
                    <span className="sr-only">Next image</span>
                  </button>
                  <div className="absolute bottom-4 left-4 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
                    {activeImageIndex + 1} / {totalGalleryImages}
                  </div>
                  <div className="absolute bottom-4 right-4">
                    <Dialog open={isMediaDialogOpen} onOpenChange={setIsMediaDialogOpen}>
                      <DialogTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-full bg-black/70 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
                          View all media
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
                                className={`group relative overflow-hidden rounded-xl border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                                  isActive
                                    ? 'border-black ring-2 ring-black/20'
                                    : 'border-transparent hover:border-gray-300'
                                }`}
                              >
                                <img
                                  src={image.src}
                                  alt={image.alt}
                                  className="h-36 w-full object-contain bg-white transition group-hover:scale-[1.03]"
                                  onError={(event) => {
                                    event.currentTarget.src = '/logo.svg';
                                  }}
                                />
                                {isActive && (
                                  <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-semibold uppercase tracking-wide text-white">
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

        <div className="space-y-8 lg:flex-1">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400">
              {product.brand && <span>{product.brand}</span>}
              {!product.brand && product.category?.name && <span>{product.category.name}</span>}
              {displaySku && <span>SKU {displaySku}</span>}
            </div>
            <h1 className="text-3xl font-semibold text-gray-900">{product.title}</h1>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              {renderStaticStars(product.ratingAverage || 0)}
              <span className="font-semibold text-gray-900">
                {(product.ratingAverage || 0).toFixed(1)}
              </span>
              <span>
                ({product.ratingCount || 0} review{(product.ratingCount || 0) === 1 ? '' : 's'})
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-baseline gap-3">
            <p className="text-4xl font-semibold text-gray-900">£{displayPrice.toFixed(2)}</p>
            {compareAtPrice && compareAtPrice > displayPrice && (
              <p className="text-sm font-medium text-gray-400 line-through">
                £{compareAtPrice.toFixed(2)}
              </p>
            )}
            {product.isOnSale && (
              <Badge className="rounded-full bg-primary/10 px-3 py-1 text-primary">On sale</Badge>
            )}
          </div>

          <div className={`flex items-center gap-2 text-sm font-medium ${stockStatusColor}`}>
            {isOutOfStock ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
            <span>
              {isOutOfStock
                ? 'Out of stock'
                : canBackorder
                  ? 'Available on backorder'
                  : lowStock
                    ? `Low stock — only ${availableStock} left`
                    : 'In stock'}
            </span>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            <span className="font-medium text-gray-900">Finance available.</span>{' '}
            Terms & conditions apply.
          </div>

          {(product.description || activeVariation?.description) && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-900">Overview</h2>
              <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-wrap">
                {activeVariation?.description || product.description}
              </p>
            </div>
          )}

          {variationAttributes.length > 0 && (
            <div className="space-y-4">
              {variationAttributes.map(({ name, values }) => (
                <div key={name} className="space-y-2">
                  <p className="text-sm font-semibold text-gray-900">{name}</p>
                  <div className="flex flex-wrap gap-2">
                    {values.map((value) => {
                      const isSelected = selectedOptions[name] === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => handleOptionSelect(name, value)}
                          className={`rounded-full border px-4 py-1 text-sm font-medium transition ${
                            isSelected
                              ? 'border-black bg-black text-white'
                              : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-black/30 hover:text-black'
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

          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-900">Quantity</p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center overflow-hidden rounded-full border border-gray-300 bg-white">
                <button
                  type="button"
                  onClick={handleDecreaseQuantity}
                  className="h-9 w-9 text-lg font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
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
                  className="h-9 w-14 border-l border-r border-gray-300 text-center text-sm font-semibold focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleIncreaseQuantity}
                  className="h-9 w-9 text-lg font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={selectedQuantity >= maxPurchasable}
                >
                  +
                </button>
              </div>
              {!canBackorder && availableStock > 0 && (
                <span className="text-xs text-gray-500">
                  {lowStock ? `Hurry, only ${availableStock} left!` : `${availableStock} available`}
                </span>
              )}
              {canBackorder && (
                <span className="text-xs text-amber-600">
                  Ships as soon as it’s back in stock
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Button
              type="button"
              className="flex-1 bg-black text-white hover:bg-black/90"
              onClick={handleAddToCart}
              disabled={isOutOfStock || addingToCart || isInCart}
            >
              {addingToCart ? (
                <span className="flex items-center gap-2">
                  <OneLoader size="tiny" inline />
                  Adding…
                </span>
              ) : isInCart ? (
                'Already in cart'
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <ShoppingCart size={18} />
                  Add to shopping bag
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              type="button"
              className={`flex-1 transition ${
                isWishlisted ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100' : ''
              }`}
              onClick={handleAddToWishlist}
            >
              <span className="flex items-center justify-center gap-2">
                <Heart size={18} className={isWishlisted ? 'text-red-500' : 'text-gray-700'} fill={isWishlisted ? 'currentColor' : 'none'} />
                {isWishlisted ? 'Saved' : 'Save to wishlist'}
              </span>
            </Button>
            <Button
              type="button"
              className="flex-1 bg-primary text-white hover:bg-primary/90"
              onClick={handleBuyNow}
              disabled={isOutOfStock || buyNowLoading}
            >
              {buyNowLoading ? (
                <span className="flex items-center gap-2">
                  <OneLoader size="tiny" inline />
                  Processing…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <ArrowRight size={18} />
                  Buy now
                </span>
              )}
            </Button>
          </div>

          {productTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
              <Tag size={16} className="text-gray-400" />
              {productTags.map((tag) => (
                <Badge key={tag._id} className="bg-gray-100 text-gray-600">
                  #{tag.name}
                </Badge>
              ))}
            </div>
          )}

          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">How to get it</h2>
            <div className="space-y-3">
              {fulfilmentOptions.map(({ key, title, description, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-left transition hover:border-black hover:bg-gray-50"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                      <Icon className="h-5 w-5 text-gray-700" />
                    </span>
                    <span>
                      <p className="text-sm font-semibold text-gray-900">{title}</p>
                      <p className="text-xs text-gray-500">{description}</p>
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-gray-900">Related products</h2>
        <p className="mt-1 text-sm text-gray-500">
          Inspired by what you viewed. Hand-picked from the same range.
        </p>

        {relatedStatus === 'loading' ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <ProductCardSkeleton key={i} gridType="grid2" />
            ))}
          </div>
        ) : relatedError ? (
          <div className="mt-4 rounded-lg border border-black/20 bg-black/5 px-4 py-3 text-sm text-black">
            {relatedError}
          </div>
        ) : relatedProducts.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            We couldn’t find similar products right now. Check back later for more inspiration.
          </p>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedProducts.map((related) => (
              <button
                key={related._id}
                type="button"
                onClick={() => navigate(`/product/${related.slug || related._id}`)}
                className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="relative h-48 w-full overflow-hidden">
                  <img
                    src={
                      related.picture?.secure_url ||
                      related.image ||
                      related.images?.[0]?.secure_url ||
                      '/logo.svg'
                    }
                    alt={related.title}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    onError={(event) => {
                      event.currentTarget.src = '/logo.svg';
                    }}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">
                    {related.title}
                  </h3>
                  <p className="text-sm font-medium text-gray-900">
                    £{(related.price || 0).toFixed(2)}
                  </p>
                  <span className="text-xs text-primary">View details →</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {product.additionalInfo && (
        <div className="mt-8 bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Product details</h2>
          <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
            {product.additionalInfo}
          </p>
        </div>
      )}

      <section className="mt-10 bg-white rounded-2xl shadow-sm p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="lg:w-1/3 space-y-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Customer reviews</h2>
              <p className="text-sm text-gray-500">Real feedback from Furniture-inspired shoppers.</p>
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

