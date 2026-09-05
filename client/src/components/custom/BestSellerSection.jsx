import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import { fetchBestSellers } from '@/redux/slices/products/productSlice';
import { addToCart } from '@/redux/slices/cart/cartSlice';
import ProductCard from './ProductCard';
import ProductCardSkeleton from './ProductCardSkeleton';
import { Skeleton } from '../ui/skeleton';
import NavigationButtons from './NavigationButtons';
import { ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const BestSellerSection = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const swiperRef = useRef(null);
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(false);
  const [quantities, setQuantities] = useState({});
  const [addingProductId, setAddingProductId] = useState(null);

  const { bestSellers, bestSellersStatus } = useSelector((state) => state.products);
  const { items: cartItems } = useSelector((state) => state.cart);

  useEffect(() => {
    dispatch(fetchBestSellers(12));
  }, [dispatch]);

  const handleQuantityChange = (productId, quantity, maxStock) => {
    const qty = Math.max(1, Math.min(quantity || 1, maxStock || 999));
    setQuantities((prev) => ({ ...prev, [productId]: qty }));
  };

  const handleAddToCart = async (product) => {
    try {
      setAddingProductId(product._id);
      const quantity = quantities[product._id] || 1;
      const productId = product._id || product.id;
      if (!productId) {
        throw new Error('Product identifier missing');
      }
      await dispatch(addToCart({ productId, quantity })).unwrap();
      toast.success('Product added to cart', { duration: 3000 });
    } catch (error) {
      const message = error?.message || 'Failed to add to cart';
      toast.error(message, { duration: 3000 });
    } finally {
      setAddingProductId(null);
    }
  };

  const handleProductClick = (product) => {
    if (!product || (!product._id && !product.slug)) return;
    const identifier = product.slug || product._id;
    navigate(`/product/${identifier}`);
  };

  useEffect(() => {
    const initialQuantities = {};
    bestSellers.forEach((product) => {
      if (product._id && !quantities[product._id]) {
        initialQuantities[product._id] = 1;
      }
    });
    if (Object.keys(initialQuantities).length > 0) {
      setQuantities((prev) => ({ ...prev, ...initialQuantities }));
    }
  }, [bestSellers, quantities]);

  if (bestSellersStatus === 'loading') {
    return (
      <div className="max-w-[1800px] mx-auto px-3 sm:px-4 lg:px-6 pt-3 pb-3 md:pb-4 lg:pb-5">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-32 sm:h-6 sm:w-40 md:h-7 md:w-48" />
            <Skeleton className="h-3.5 w-48 sm:w-56 md:w-64" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 px-2 sm:px-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductCardSkeleton key={i} gridType="grid2" showCartControls={false} />
          ))}
        </div>
      </div>
    );
  }

  if (!bestSellers || bestSellers.length === 0) {
    return null;
  }

  return (
    <div className="max-w-[1800px] mx-auto px-3 sm:px-4 lg:px-6 pt-3 pb-3 md:pb-4 lg:pb-5">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-caramel-deep mb-1">Most Loved</p>
          <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-semibold text-espresso mb-1 tracking-tight">
            Best Sellers
          </h2>
          <p className="text-xs sm:text-sm text-mocha">
            Crowd favourites that shoppers keep coming back to
          </p>
        </div>
        <Link
          to="/products?sortBy=popularity"
          className="hidden md:flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View All
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="relative group px-2 sm:px-6">
        <Swiper
          ref={swiperRef}
          modules={[Navigation]}
          navigation={{
            nextEl: '.best-seller-button-next',
            prevEl: '.best-seller-button-prev',
            disabledClass: 'swiper-button-disabled'
          }}
          spaceBetween={10}
          observer
          observeParents
          breakpoints={{
            320: { slidesPerView: 2.3 },
            480: { slidesPerView: 2 },
            640: { slidesPerView: 3 },
            768: { slidesPerView: 3 },
            1024: { slidesPerView: 4 },
            1280: { slidesPerView: 4 },
            1536: { slidesPerView: 5 },
            1800: { slidesPerView: 6 }
          }}
          slidesPerView={2.3}
          onSlideChange={(swiper) => {
            setIsBeginning(swiper.isBeginning);
            setIsEnd(swiper.isEnd);
          }}
          onInit={(swiper) => {
            setIsBeginning(swiper.isBeginning);
            setIsEnd(swiper.isEnd);
            swiper.navigation.update();
          }}
          className="best-seller-swiper"
        >
          {bestSellers.map((product) => (
            <SwiperSlide key={product._id} className="!h-auto">
              <div className="h-full flex px-1">
                <ProductCard
                  product={product}
                  quantity={quantities[product._id] || 1}
                  onQuantityChange={handleQuantityChange}
                  onAddToCart={handleAddToCart}
                  isAddingToCart={addingProductId === product._id}
                  isInCart={cartItems.some(
                    (item) => (item.product?._id || item.product) === product._id
                  )}
                  gridType="grid2"
                  onProductClick={handleProductClick}
                  showCartControls={false}
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        <NavigationButtons
          isBeginning={isBeginning}
          isEnd={isEnd}
          swiperRef={swiperRef}
          showOnMobile={false}
        />
      </div>

      <div className="flex justify-center mt-4 md:mt-6 md:hidden">
        <Link
          to="/products?sortBy=popularity"
          className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View All Best Sellers
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
};

export default BestSellerSection;


