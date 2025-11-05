import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart, removeFromCart, updateCartQuantity } from '@/redux/slices/cart/cartSlice';
import { AllCategory } from '@/redux/slices/categories/categoriesSlice';
import { fetchProducts } from '@/redux/slices/products/productSlice';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import CategorySwiper from './CategorySwiper';
import SearchBar from './SearchBar';
import ProductGrid from './ProductGrid';
import Pagination from './Pagination';
import { useSearch } from '@/hooks/use-search';
import { usePagination } from '@/hooks/use-pagination';
import { ShoppingCart } from 'lucide-react';
import { Badge } from '../ui/badge';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '../ui/sheet';
import { Button } from '../ui/button';
import CartImage from '../ui/CartImage';

// Import the optimized ProductCard component
import ProductCard from './ProductCard';

// Cart Product Component
const CartProduct = ({ product, quantity }) => {
  const dispatch = useDispatch();
  const [inputQty, setInputQty] = useState(quantity);
  const { _id, title, price, stock } = product;
  const image = product.image || product.picture?.secure_url;

  const updateQuantity = (newQty) => {
    if (newQty !== quantity && newQty > 0 && newQty <= stock) {
      setInputQty(newQty);
      dispatch(updateCartQuantity({ productId: _id, quantity: newQty }));
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    dispatch(removeFromCart(_id));
    toast.success('Product removed from cart');
  };

  const handleDecrease = (e) => {
    e.stopPropagation();
    if (inputQty > 1) {
      updateQuantity(inputQty - 1);
    }
  };

  const handleIncrease = (e) => {
    e.stopPropagation();
    if (inputQty < stock) {
      updateQuantity(inputQty + 1);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <div className="flex items-center space-x-3">
        <CartImage
          src={image}
          alt={title}
          className="w-12 h-12 rounded-md border border-gray-200 object-cover"
          fallback="/fallback.jpg"
          quality={80}
        />
        <div className="min-w-0 flex-1">
          <h4 className="font-medium text-sm text-gray-900 line-clamp-2">{title}</h4>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <div className="flex items-center border border-gray-200 rounded-md">
          <button
            onClick={handleDecrease}
            className="w-8 h-8 flex items-center justify-center text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={inputQty <= 1}
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-medium text-gray-900">{inputQty}</span>
          <button
            onClick={handleIncrease}
            className="w-8 h-8 flex items-center justify-center text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={inputQty >= stock}
          >
            +
          </button>
        </div>
        <button
          onClick={handleRemove}
          className="text-red-500 hover:text-red-700 text-sm font-medium hover:bg-red-50 px-2 py-1 rounded-md transition-colors"
        >
          Remove
        </button>
      </div>
    </div>
  );
};

const ProductList = () => {
  // Use the search hook to eliminate duplication
  const search = useSearch({
    initialCategory: 'all',
    initialPage: 1,
    initialLimit: 24,
    initialStockFilter: 'active',
    initialSortBy: 'az'
  });

  // Local state for UI-specific functionality
  const [quantities, setQuantities] = useState({});
  const [addingProductId, setAddingProductId] = useState(null);
  const [gridType, setGridType] = useState('grid2');
  const [previewImage, setPreviewImage] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Redux selectors
  const { categories, status: categoriesStatus } = useSelector((s) => s.categories);
  const { products: productList = [], status, totalItems } = useSelector((s) => s.products);
  const { user } = useSelector((s) => s.auth);
  const { items: cartItems = [] } = useSelector((s) => s.cart);
  
  // Calculate total quantity
  const totalQuantity = useMemo(() => 
    cartItems.reduce((sum, item) => sum + item.quantity, 0), 
    [cartItems]
  );

  // Use pagination hook to eliminate pagination duplication
  const pagination = usePagination({
    initialPage: 1,
    initialLimit: 24,
    totalItems,
    onPageChange: (page) => {
      search.handlePageChange(page);
    }
  });

  // Memoized combined categories
  const combinedCategories = useMemo(() => {
    const allCategories = [
      { _id: 'all', name: 'All', image: 'https://cdn.pixabay.com/photo/2023/07/19/12/16/car-8136751_1280.jpg' },
      ...(categories || [])
    ];
    // Sort by position if position exists, otherwise keep original order
    return allCategories.sort((a, b) => {
      if (a._id === 'all') return -1; // Keep 'All' at the beginning
      if (b._id === 'all') return 1;
      const posA = a.position ?? 999;
      const posB = b.position ?? 999;
      return posA - posB;
    });
  }, [categories]);

  // Products are now sorted on the backend, so we use them directly
  const sortedProducts = useMemo(() => {
    // The backend already handles filtering, so we just need to ensure products exist and are valid
    return productList.filter((product) => product && product._id);
  }, [productList]);

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [search.page]);

  // Store handleSearch in a ref to avoid dependency issues
  const handleSearchRef = useRef(search.handleSearch);
  handleSearchRef.current = search.handleSearch;
  
  // Track last search params to prevent unnecessary calls
  const lastSearchParamsRef = useRef('');
  const isSearchingRef = useRef(false);
  
  // Fetch products with debounced search using the hook
  // NOTE: page is NOT in dependencies to prevent loops when handleSearch auto-adjusts page
  useEffect(() => {
    // Prevent concurrent searches
    if (isSearchingRef.current) return;
    
    // Create a key from search params (excluding page to prevent loops)
    const searchKey = `${search.debouncedSearchTerm || ''}-${search.category}-${search.sortBy}-${JSON.stringify(search.enterSuggestionIds || [])}`;
    
    // Only call if search params actually changed
    if (lastSearchParamsRef.current !== searchKey) {
      lastSearchParamsRef.current = searchKey;
      isSearchingRef.current = true;
      
      const result = handleSearchRef.current?.(search.debouncedSearchTerm);
      // Ensure we always have a promise to call finally on
      Promise.resolve(result).finally(() => {
        isSearchingRef.current = false;
      });
    }
  }, [search.debouncedSearchTerm, search.category, search.sortBy, search.enterSuggestionIds]);
  
  // Handle page changes separately (only user-initiated via pagination)
  const prevPageRef = useRef(search.page);
  useEffect(() => {
    const pageChanged = prevPageRef.current !== search.page;
    prevPageRef.current = search.page;
    
    // Only trigger search if page changed (user clicked pagination)
    // Skip if we're already searching to prevent loops
    if (pageChanged && !isSearchingRef.current) {
      isSearchingRef.current = true;
      const searchKey = `${search.debouncedSearchTerm || ''}-${search.category}-${search.sortBy}-${JSON.stringify(search.enterSuggestionIds || [])}`;
      lastSearchParamsRef.current = searchKey;
      
      const result = handleSearchRef.current?.(search.debouncedSearchTerm);
      // Ensure we always have a promise to call finally on
      Promise.resolve(result).finally(() => {
        isSearchingRef.current = false;
      });
    }
  }, [search.page]);

  // Fetch categories on mount and ensure they stay loaded
  useEffect(() => {
    dispatch(AllCategory());
  }, [dispatch]);

  // Ensure categories are always available (refetch if empty)
  useEffect(() => {
    if ((!categories || categories.length === 0) && categoriesStatus !== 'loading') {
      dispatch(AllCategory());
    }
  }, [dispatch, categories, categoriesStatus]);

  // Initialize quantities when products change
  useEffect(() => {
    if (productList.length > 0) {
      const initialQuantities = {};
      productList.filter(product => product && product._id).forEach((product) => {
        initialQuantities[product._id] = product.stock > 0 ? 1 : 0;
      });
      setQuantities(initialQuantities);
    }
  }, [productList]);

  // Scroll detection for both desktop and mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Optimized handlers
  const handleQuantityChange = useCallback((productId, value, stock) => {
    if (value === '') {
      return setQuantities((prev) => ({ ...prev, [productId]: '' }));
    }
    const newValue = Math.max(Math.min(parseInt(value), stock), 1);
    setQuantities((prev) => ({ ...prev, [productId]: newValue }));
  }, []);

  const handleAddToCart = useCallback((product) => {
    if (!user) {
      toast.warning('You must login first');
      navigate('/login');
      return;
    }

    const qty = parseInt(quantities[product._id]);
    if (!qty || qty <= 0) {
      toast.warning('Please select at least 1 item');
      return;
    }

    setAddingProductId(product._id);
    dispatch(addToCart({
      productId: product._id,
      quantity: qty
    })).then(() => {
      toast.success('Product added to cart');
      // Keep the selected quantity instead of resetting to 1
    }).finally(() => setAddingProductId(null));
  }, [dispatch, navigate, quantities, user]);

  // Memoized handlers for child components
  const handleCategorySelect = useCallback((categoryId) => {
    // Clear selected product first
    search.setSelectedProductId(null);
    // Clear suggestion IDs
    search.setEnterSuggestionIds([]);
    // Update category (this will trigger useEffect to fetch products)
    search.setCategory(categoryId);
    // Clear search term and active search term
    search.handleSearchChange('');
    // Scroll to top when selecting a category
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [search]);

  // Add function to clear selected product and return to normal view
  const handleClearSelectedProduct = useCallback(() => {
    search.setSelectedProductId(null);
    search.clearSearch();
  }, [search]);

  const handleGridTypeChange = useCallback((type) => {
    setGridType(type);
  }, []);

  const handleSortChange = useCallback((order) => {
    search.setSortBy(order);
  }, [search]);

  const handlePageChange = useCallback((newPage) => {
    pagination.setCurrentPage(newPage);
  }, [pagination]);
  
  const handlePreviewImage = useCallback((image) => {
    setPreviewImage(image);
  }, []);
  
  const loadingProducts = status === 'loading';
  
  return (
    <div className="max-w-7xl lg:mx-auto lg:px-4 py-2 lg:py-8">
      {/* Mobile Header with Logo and Name - Only visible on mobile */}
      {isMobile && (
        <div className={`fixed top-0 left-0 right-0 z-50 ${isScrolled ? 'bg-white border-b border-gray-200' : 'bg-primary/10 border-b border-primary/20'} shadow-sm lg:hidden transition-all duration-300 ease-in-out ${isScrolled ? '-translate-y-full' : 'translate-y-0'}`}>
          <div className="flex items-center justify-center px-4 py-3">
            <Link to="/" className="flex items-center space-x-2">
              <div className="flex-shrink-0">
                <img
                  src="/logo.jpeg"
                  alt="GULTRADERS Logo"
                  className="h-8 w-auto object-contain"
                />
              </div>
              <div>
                <div className={`text-base font-semibold ${isScrolled ? 'text-gray-900' : 'text-primary'}`}>GULTRADERS</div>
              </div>
            </Link>
          </div>
        </div>
      )}
      
      {/* Fixed Search and Categories Container */}
      <div className={`fixed ${isMobile && isScrolled ? 'top-0' : isMobile ? 'top-14' : 'top-0'} left-0 right-0 z-40 ${isMobile ? (isScrolled ? 'bg-white border-b border-gray-200' : 'bg-primary/10 border-b border-primary/20') : 'bg-white/95 border-b border-gray-200/50'} backdrop-blur-xl shadow-md pb-2 search-categories-container transition-all duration-300 ${isScrolled && !isMobile ? 'scrolled-up' : ''}`}>
        {/* Search and Sort Bar */}
        <div className={`max-w-7xl lg:mx-auto lg:px-4 pt-4 transition-all duration-300 ${isScrolled && !isMobile ? 'lg:mt-2' : 'lg:mt-14'}`}>
          <SearchBar
            searchTerm={search.searchTerm}
            onSearchChange={search.handleSearchChange}
            onSearchSubmit={search.handleSearchWithTracking}
            gridType={gridType}
            onGridTypeChange={handleGridTypeChange}
            searchHistory={search.searchHistory}
            popularSearches={search.popularSearches}
            products={search.allProducts}
            isRedBackground={isMobile && !isScrolled}
          />
        </div>
      
        {/* Category Swiper - Always visible, even during search */}
        <div className="max-w-7xl lg:mx-auto lg:px-4">
          {combinedCategories && combinedCategories.length > 0 ? (
            <CategorySwiper
              categories={combinedCategories}
              selectedCategory={search.category}
              onCategorySelect={handleCategorySelect}
            />
          ) : (
            // Show placeholder or loading state for categories
            <div className="mt-4 pb-6">
              <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className="w-14 h-14 rounded-full bg-gray-200 animate-pulse"></div>
                    <div className="h-4 w-16 bg-gray-200 animate-pulse rounded mt-1"></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Spacer to prevent content from going under fixed header */}
      <div className="h-64 lg:h-52"></div>

     

      {/* Product Grid */}
      <ProductGrid
        products={sortedProducts}
        loading={loadingProducts}
        gridType={gridType}
        quantities={quantities}
        onQuantityChange={handleQuantityChange}
        onAddToCart={handleAddToCart}
        addingProductId={addingProductId}
        cartItems={cartItems}
        onPreviewImage={handlePreviewImage}
        searchTerm={search.searchTerm}
      />

      {/* Pagination */}
      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPageChange={handlePageChange}
      />

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={() => setPreviewImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Product image preview"
        >
          <div
            className="relative w-full max-w-5xl max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImage}
              alt="Preview"
              className="rounded-lg shadow-lg object-contain w-full h-auto max-h-[90vh]"
              loading="eager"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 md:top-4 md:right-4 lg:right-24 xl:right-24 bg-black/70 hover:bg-primary text-white rounded-full p-1 px-2 text-sm md:text-base"
              aria-label="Close preview"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Floating Cart Icon - Desktop Only */}
      {!isMobile && isScrolled && (
        <div className="fixed top-20 right-4 z-50 cart-floating">
          <Sheet>
            <SheetTrigger asChild>
              <button className="relative p-3 bg-white rounded-full shadow-lg hover:shadow-xl border border-gray-200 hover:bg-gray-50 transition-all duration-300 hover:scale-110">
                <ShoppingCart size={24} className="text-gray-700" />
                {totalQuantity > 0 && (
                  <Badge className="absolute -top-1 -right-1 text-xs px-1.5 py-0.5 bg-primary text-white border-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full animate-pulse">
                    {totalQuantity}
                  </Badge>
                )}
              </button>
            </SheetTrigger>
            <SheetContent className="w-full sm:w-[400px]">
              <SheetHeader>
                <SheetTitle className="text-lg font-semibold text-gray-900">Shopping Cart</SheetTitle>
                <SheetDescription className="text-gray-600">
                  {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'} in your cart
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 max-h-[60vh] overflow-y-auto">
                {cartItems.length > 0 ? (
                  cartItems.map((item) => (
                    <CartProduct
                      key={item.product._id}
                      product={item.product}
                      quantity={item.quantity}
                    />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <ShoppingCart size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">Your cart is empty</p>
                  </div>
                )}
              </div>
              <SheetFooter className="mt-6">
                <SheetClose asChild>
                  <Button
                    onClick={() => {
                      if (!user) {
                        navigate('/login');
                      } else if (cartItems.length === 0) {
                        toast.error('Your cart is empty.');
                      } else {
                        navigate('/checkout');
                      }
                    }}
                    disabled={cartItems.length === 0}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2.5"
                  >
                    Proceed to Checkout
                  </Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      )}

      {/* WhatsApp Button */}
      <div className="fixed animate-bounce bottom-18 lg:bottom-5 right-0 lg:right-2 z-50">
        <Link
          to="https://wa.me/923114000096?text=Hi%20How%20Are%20you%20?"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contact us on WhatsApp"
        >
          <img
            className="w-14 h-14"
            src="/WhatsApp.svg.webp"
            alt="WhatsApp"
            loading="lazy"
            width="56"
            height="56"
          />
        </Link>
      </div>
    </div>
  );
};

export default ProductList;