import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '@/redux/slices/cart/cartSlice';
import { AllCategory } from '@/redux/slices/categories/categoriesSlice';
import { fetchProducts } from '@/redux/slices/products/productSlice';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import CategorySwiper from './CategorySwiper';
import HeroSection from './HeroSection';
import NewArrivalsSection from './NewArrivalsSection';
import BestSellerSection from './BestSellerSection';
import ProductGrid from './ProductGrid';
import Pagination from './Pagination';
import { useSearch } from '@/hooks/use-search';
import { usePagination } from '@/hooks/use-pagination';
import { ChevronLeft, MessageCircle } from 'lucide-react';
import { Badge } from '../ui/badge';
import { useAuthDrawer } from '@/contexts/AuthDrawerContext';
// Import the optimized ProductCard component
import ProductCard from './ProductCard';

const ProductList = ({ 
  search: searchProp, 
  gridType: gridTypeProp, 
  onGridTypeChange: onGridTypeChangeProp 
}) => {
  // Use search from props if provided, otherwise create new one
  const search = searchProp || useSearch({
    initialCategory: 'all',
    initialPage: 1,
    initialLimit: 24,
    initialStockFilter: 'active',
    initialSortBy: 'az'
  });

  // Local state for UI-specific functionality
  const [quantities, setQuantities] = useState({});
  const [addingProductId, setAddingProductId] = useState(null);
  const [gridType, setGridType] = useState(gridTypeProp || 'grid2');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [categoryStack, setCategoryStack] = useState([]);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { openAuthDrawer } = useAuthDrawer();

  // Redux selectors
  const { categories = [], status: categoriesStatus } = useSelector((s) => s.categories);
  const { products: productList = [], status, totalItems } = useSelector((s) => s.products);
  const { user } = useSelector((s) => s.auth);
  const { items: cartItems = [] } = useSelector((s) => s.cart);
  const unreadCounts = useSelector((s) => s.chat.unreadCounts);
  
  // Calculate total quantity
  const totalQuantity = useMemo(() => 
    cartItems.reduce((sum, item) => sum + item.quantity, 0), 
    [cartItems]
  );
  const chatUnreadTotal = useMemo(
    () =>
      Object.values(unreadCounts || {}).reduce(
        (sum, value) => sum + (Number(value) || 0),
        0
      ),
    [unreadCounts]
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

  const currentParent = categoryStack[categoryStack.length - 1] ?? null;

  const visibleCategories = useMemo(() => {
    if (!Array.isArray(categories)) return [];
    if (!currentParent) {
      return categories.filter((cat) => !cat.parentId);
    }
    return categories.filter((cat) => cat.parentId === currentParent._id);
  }, [categories, currentParent]);

  const sortedVisibleCategories = useMemo(() => {
    return [...visibleCategories].sort((a, b) => {
      const posA = a?.position ?? 999;
      const posB = b?.position ?? 999;
      if (posA !== posB) return posA - posB;
      return a.name.localeCompare(b.name);
    });
  }, [visibleCategories]);

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
    if (categoriesStatus === 'idle') {
      dispatch(AllCategory({ includeInactive: true }));
    }
  }, [dispatch, categoriesStatus]);

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
  }, [dispatch, quantities]);

  // Memoized handlers for child components
  const handleCategorySelect = useCallback((selectedCategory) => {
    if (!selectedCategory || !selectedCategory._id) return;

    if (search.category === selectedCategory._id) {
      search.setSelectedProductId(null);
      search.setEnterSuggestionIds([]);
      search.setCategory('all');
      search.handleSearchChange('');
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    if (selectedCategory.slug) {
      navigate(`/category/${selectedCategory.slug}`);
      return;
    }

    search.setSelectedProductId(null);
    search.setEnterSuggestionIds([]);
    search.setCategory(selectedCategory._id);
    search.handleSearchChange('');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [navigate, search]);
  const handleNavigateDown = useCallback((category) => {
    if (!category) return;
    const hasChildren = categories.some((cat) => cat.parentId === category._id);
    if (!hasChildren) return;
    setCategoryStack((prev) => [...prev, category]);
  }, [categories]);

  const handleNavigateUp = useCallback(() => {
    setCategoryStack((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
  }, []);

  const resetToRoot = useCallback(() => {
    setCategoryStack([]);
  }, []);

  const breadcrumbItems = useMemo(() => {
    const items = [{ category: null }];
    categoryStack.forEach((cat) => {
      items.push({ label: cat.name, category: cat });
    });
    return items;
  }, [categoryStack]);

  const handleBreadcrumbClick = useCallback((index) => {
    if (index === 0) {
      setCategoryStack([]);
      return;
    }
    setCategoryStack((prev) => prev.slice(0, index));
  }, []);


  // Add function to clear selected product and return to normal view
  const handleClearSelectedProduct = useCallback(() => {
    search.setSelectedProductId(null);
    search.clearSearch();
  }, [search]);

  const handleGridTypeChange = useCallback((type) => {
    setGridType(type);
    if (onGridTypeChangeProp) {
      onGridTypeChangeProp(type);
    }
  }, [onGridTypeChangeProp]);

  const handleSortChange = useCallback((order) => {
    search.setSortBy(order);
  }, [search]);

  const handlePageChange = useCallback((newPage) => {
    pagination.setCurrentPage(newPage);
  }, [pagination]);
  
  const handleProductClick = useCallback((product) => {
    if (!product || (!product._id && !product.slug)) return;
    const identifier = product.slug || product._id;
    navigate(`/product/${identifier}`);
  }, [navigate]);

  const handleChatClick = useCallback(() => {
    if (!user) {
      openAuthDrawer('login', { redirectTo: '/chat' });
      return;
    }
    navigate('/chat');
  }, [navigate, openAuthDrawer, user]);
  
  const loadingProducts = status === 'loading';
  
  return (
    <div className="max-w-7xl lg:mx-auto lg:px-4 py-2 ">
      {/* Categories Container - Static Position */}
      <div className={`${isMobile ? (isScrolled ? 'bg-white border-b border-gray-200' : 'bg-primary/10 border-b border-primary/20') : 'bg-white border-b border-gray-200'} pb-0.5 sm:pb-2`}>
        {/* Category Swiper - Always visible, even during search */}
        <div className="max-w-7xl lg:mx-auto lg:px-4">
          <nav className="px-2 pt-1 pb-1 sm:px-4 sm:pt-4 sm:pb-2 lg:px-6" aria-label="Category breadcrumbs">
            <ol className="flex flex-wrap items-center gap-1 text-xs font-medium text-slate-600">
              {breadcrumbItems.map((item, index) => {
                const isLast = index === breadcrumbItems.length - 1;
                return (
                  <li key={`crumb-${index}`} className="flex items-center gap-1">
                    {index > 0 && <span className="text-slate-400">/</span>}
                    {isLast ? (
                      <span className="text-primary">{item.label}</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleBreadcrumbClick(index)}
                        className="text-slate-600 hover:text-primary transition-colors"
                      >
                        {item.label}
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>

          {categoryStack.length > 0 && (
            <div className="flex items-center justify-between px-2 pt-2 pb-1 text-sm text-slate-600 sm:px-4 sm:pt-4 sm:pb-2 lg:px-6">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleNavigateUp}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  <ChevronLeft size={14} />
                  Back
                </button>
                <span className="font-medium text-slate-800">
                  {currentParent?.name || 'Category'}
                </span>
              </div>
              <button
                type="button"
                onClick={resetToRoot}
                className="text-xs font-medium text-primary hover:underline"
              >
                View all categories
              </button>
            </div>
          )}
          {categoriesStatus === 'loading' ? (
            // Show placeholder or loading state for categories
            <div className="mt-1.5 pb-3 sm:mt-4 sm:pb-6">
              <div className="grid grid-cols-4 lg:grid-cols-7 gap-3">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className="w-full aspect-square rounded-lg bg-gray-200 animate-pulse"></div>
                    <div className="h-4 w-16 bg-gray-200 animate-pulse rounded mt-2"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : visibleCategories && visibleCategories.length > 0 ? (
            <CategorySwiper
              categories={sortedVisibleCategories.map((category) => ({
                ...category,
                hasChildren: categories.some((child) => child.parentId === category._id),
              }))}
              selectedCategory={search.category}
              onCategorySelect={handleCategorySelect}
              onNavigateDown={handleNavigateDown}
            />
          ) : (
            // Show message when no categories are available
            <div className="mt-1.5 pb-3 sm:mt-4 sm:pb-6 text-center py-5 sm:py-8">
              <p className="text-gray-500 text-sm">
                {categoryStack.length > 0
                  ? 'No subcategories available for this selection.'
                  : 'No categories available. Please add categories to continue.'}
              </p>
              {categoryStack.length > 0 && (
                <button
                  type="button"
                  onClick={resetToRoot}
                  className="mt-3 text-sm font-medium text-primary hover:underline"
                >
                  Back to top-level categories
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hero Section - Below Categories */}
      <div className="mt-3 sm:mt-6">
        <HeroSection />
      </div>

      {/* New Arrivals Section - Below Hero */}
      <NewArrivalsSection />

      {/* Best Seller Section - Below New Arrivals */}
      <BestSellerSection />

      {/* Pagination */}
      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPageChange={handlePageChange}
      />


      <button
        type="button"
        onClick={handleChatClick}
        className="fixed bottom-5 right-4 z-50 flex items-center gap-2 rounded-full bg-black px-4 py-3 text-white shadow-xl transition hover:bg-black/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
        aria-label="Open chat"
      >
        <MessageCircle size={18} className="text-white" />
        <span className="hidden sm:inline text-sm font-semibold">Chat with us</span>
        {chatUnreadTotal > 0 && (
          <Badge className="ml-1 border-0 bg-white px-2 py-0.5 text-[11px] font-semibold text-black">
            {chatUnreadTotal}
          </Badge>
        )}
      </button>

    </div>
  );
};

export default ProductList;