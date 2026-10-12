import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '@/redux/slices/cart/cartSlice';
import { AllCategory } from '@/redux/slices/categories/categoriesSlice';
import { fetchProducts } from '@/redux/slices/products/productSlice';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import HomeCategories from './HomeCategories';
import ProductShowcase from './product-showcase';
import NewArrivalsSection from './NewArrivalsSection';
import BestSellerSection from './BestSellerSection';
import Reveal from './Reveal';
import HomeTrustBar from './HomeTrustBar';
import HomeFeatured from './HomeFeatured';
import HomeReviews from './HomeReviews';
import HomeNewsletter from './HomeNewsletter';
import HomeProductRail from './HomeProductRail';
import HomeProductColumns from './HomeProductColumns';
import RecentlyViewedSection from './RecentlyViewedSection';
import { useSearch } from '@/hooks/use-search';
import { usePagination } from '@/hooks/use-pagination';
import { MessageCircle } from 'lucide-react';
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

    if (selectedCategory.slug) {
      navigate(`/category/${selectedCategory.slug}`);
      return;
    }

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
    <div className="max-w-[1800px] lg:mx-auto px-3 sm:px-5 lg:px-6 py-4 sm:py-5 space-y-7 sm:space-y-9">
      {/* Hero — GSAP cinematic product showcase (falls back to the banner
          carousel until an admin configures it under Settings → Product Showcase).
          IMPORTANT: no transformed/animated wrapper here — GSAP ScrollTrigger's
          `pin: true` uses position:fixed internally, and any ancestor with a
          CSS transform (even a completed animation's final translate(0)) creates
          a containing block that breaks fixed positioning mid-scroll. */}
      <ProductShowcase />

      {/* Trust / assurance strip */}
      <Reveal>
        <HomeTrustBar />
      </Reveal>

      {/* Shop by Category — image tiles, hidden until categories exist */}
      <Reveal>
        <HomeCategories />
      </Reveal>

      {/* Daily Deals — discounted items */}
      <Reveal>
        <HomeProductRail
          title="Deals of the Day"
          params={{ onSale: true, sortBy: 'sale' }}
          viewAllHref="/products?sortBy=sale"
          viewAllLabel="View all deals"
          showCountdown
        />
      </Reveal>

      {/* New Arrivals Section */}
      <Reveal>
        <NewArrivalsSection />
      </Reveal>

      {/* Recommendation For You */}
      <Reveal>
        <HomeProductRail
          eyebrow="Picked for you"
          title="Recommendation For You"
          params={{ sortBy: 'popularity' }}
          viewAllHref="/products?sortBy=popularity"
          viewAllLabel="View all recommendations"
        />
      </Reveal>

      {/* Recently Viewed — localStorage based, renders nothing if empty */}
      <Reveal>
        <RecentlyViewedSection />
      </Reveal>

      {/* Featured collections (admin-driven: home_feature placement) */}
      <Reveal>
        <HomeFeatured />
      </Reveal>

      {/* Best Seller Section */}
      <Reveal delay={1}>
        <BestSellerSection />
      </Reveal>

      {/* On sale + top rated compact columns */}
      <Reveal>
        <HomeProductColumns />
      </Reveal>

      {/* Social proof */}
      <Reveal>
        <HomeReviews />
      </Reveal>

      {/* Newsletter / WhatsApp CTA */}
      <Reveal>
        <HomeNewsletter />
      </Reveal>

      {/* Floating Chat Button */}
      <button
        type="button"
        onClick={handleChatClick}
        className="fixed bottom-24 right-4 z-50 flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 text-white shadow-[0_14px_28px_-10px_rgba(91,79,245,0.75)] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 focus-visible:outline-none lg:bottom-5"
        aria-label="Open chat"
      >
        <MessageCircle size={17} />
        <span className="hidden sm:inline text-xs font-bold tracking-wide">Chat with us</span>
        {chatUnreadTotal > 0 && (
          <Badge className="ml-1 border-0 bg-white px-1.5 py-0.2 text-[10px] font-bold text-brand">
            {chatUnreadTotal}
          </Badge>
        )}
      </button>

    </div>
  );
};

export default ProductList;