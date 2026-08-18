import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import Breadcrumbs from '@/components/custom/Breadcrumbs';
import ProductGrid from '@/components/custom/ProductGrid';
import Pagination from '@/components/custom/Pagination';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowUpRight } from 'lucide-react';

import {
  SingleCategory,
  AllCategory,
} from '@/redux/slices/categories/categoriesSlice';
import { fetchProducts } from '@/redux/slices/products/productSlice';
import { addToCart } from '@/redux/slices/cart/cartSlice';
import BannerCarousel from '@/components/custom/BannerCarousel';
import SEO from '@/components/seo/SEO';
import CategorySwiper from '@/components/custom/CategorySwiper';

const DEFAULT_LIMIT = 24;

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'stock-high', label: 'Stock: High to Low' },
];

const formatBreadcrumbLabel = (slug = '') => {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const findNodeBySlug = (nodes = [], slug) => {
  for (const node of nodes) {
    if (node.slug === slug) {
      return node;
    }
    if (node.children && node.children.length > 0) {
      const found = findNodeBySlug(node.children, slug);
      if (found) {
        return found;
      }
    }
  }
  return null;
};

const CategoryBrowse = () => {
  const params = useParams();
  const slug = params.slug;
  const restPath = params['*'] || '';
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    currentCategory,
    tree,
    children: immediateChildren,
    siblings,
  } = useSelector((state) => state.categories);
  const {
    products,
    status: productsStatus,
    totalPages,
    currentPage,
  } = useSelector((state) => state.products);
  const { user } = useSelector((state) => state.auth);
  const { items: cartItems = [] } = useSelector((state) => state.cart);

  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('relevance');
  const [gridType, setGridType] = useState('grid2');
  const [addingProductId, setAddingProductId] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const pathSegments = useMemo(() => {
    const segments = [];
    if (slug) {
      segments.push(slug);
    }
    if (restPath) {
      segments.push(
        ...restPath
          .split('/')
          .map((segment) => segment.trim())
          .filter(Boolean)
      );
    }
    return segments;
  }, [slug, restPath]);

  const currentSlug = useMemo(() => {
    if (pathSegments.length > 0) {
      return pathSegments[pathSegments.length - 1];
    }
    return slug || '';
  }, [pathSegments, slug]);

  const buildCategoryPath = useCallback((segments) => {
    const sanitized = Array.isArray(segments) ? segments.filter(Boolean) : [];
    return sanitized.length === 0 ? '' : `/category/${sanitized.join('/')}`;
  }, []);

  const navigateToSegments = useCallback(
    (segments) => {
      const sanitized = Array.isArray(segments) ? segments.filter(Boolean) : [];
      if (sanitized.length === 0) {
        return;
      }
      navigate(buildCategoryPath(sanitized));
    },
    [navigate, buildCategoryPath]
  );

  const handleNavigateToChild = useCallback(
    (childSlug) => {
      if (!childSlug) return;
      navigateToSegments([...pathSegments, childSlug]);
    },
    [navigateToSegments, pathSegments]
  );

  const handleNavigateToSibling = useCallback(
    (siblingSlug) => {
      if (!siblingSlug) return;
      navigateToSegments([...pathSegments.slice(0, -1), siblingSlug]);
    },
    [navigateToSegments, pathSegments]
  );

  const handleNavigateToParent = useCallback(() => {
    if (pathSegments.length <= 1) return;
    navigateToSegments(pathSegments.slice(0, -1));
  }, [navigateToSegments, pathSegments]);

  useEffect(() => {
    if (!currentSlug) return;
    setPage(1);
    dispatch(SingleCategory(currentSlug));
  }, [dispatch, currentSlug]);

  useEffect(() => {
    if (!tree || tree.length === 0) {
      dispatch(AllCategory({ includeInactive: true }));
    }
  }, [dispatch, tree]);

  useEffect(() => {
    if (!currentSlug) return;
    dispatch(
      fetchProducts({
        category: currentSlug,
        page,
        limit: DEFAULT_LIMIT,
        sortBy,
        stockFilter: 'all',
      })
    );
  }, [dispatch, currentSlug, page, sortBy]);

  useEffect(() => {
    if (products && products.length > 0) {
      const initial = {};
      products.forEach((product) => {
        if (product && product._id) {
          initial[product._id] = product.stock > 0 ? 1 : 0;
        }
      });
      setQuantities(initial);
    }
  }, [products]);

  // Scroll detection for consistency with Homepage
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

  const pathNodes = useMemo(() => {
    if (!Array.isArray(pathSegments) || pathSegments.length === 0) {
      return [];
    }

    const sequence = [];
    let currentLevel = Array.isArray(tree) ? tree : null;

    pathSegments.forEach((segment) => {
      let node = null;

      if (Array.isArray(currentLevel)) {
        node = currentLevel.find((item) => item?.slug === segment);
      }

      if (node) {
        sequence.push({
          name: node.name || formatBreadcrumbLabel(segment),
          slug: node.slug || segment,
        });
        currentLevel = Array.isArray(node.children) ? node.children : null;
      } else {
        sequence.push({
          name: formatBreadcrumbLabel(segment),
          slug: segment,
        });
        currentLevel = null;
      }
    });

    return sequence;
  }, [pathSegments, tree]);

  const breadcrumbs = useMemo(() => {
    if (pathNodes.length > 0) {
      return pathNodes;
    }

    if (currentCategory) {
      const ancestors = Array.isArray(currentCategory.ancestors) ? currentCategory.ancestors : [];
      if (ancestors.length > 0 || currentCategory?.name) {
        return [
          ...ancestors.map((ancestor) => ({
            name: ancestor.name,
            slug: ancestor.slug,
          })),
          { name: currentCategory.name, slug: currentCategory.slug || currentSlug },
        ].filter((item) => item?.name && item?.slug);
      }
    }

    return [];
  }, [pathNodes, currentCategory, currentSlug]);

  const categoryNode = useMemo(() => findNodeBySlug(tree, currentSlug), [tree, currentSlug]);

  const childCategories = useMemo(() => {
    if (categoryNode && categoryNode.children) {
      return categoryNode.children;
    }
    return immediateChildren || [];
  }, [categoryNode, immediateChildren]);

  const parentCategory = useMemo(() => {
    if (!currentCategory || !currentCategory.ancestors || currentCategory.ancestors.length === 0) {
      return null;
    }
    return currentCategory.ancestors[currentCategory.ancestors.length - 1];
  }, [currentCategory]);

  const siblingCategories = useMemo(() => {
    if (!siblings || siblings.length === 0) return [];
    return siblings;
  }, [siblings]);

  const handleQuantityChange = useCallback((productId, value, stock) => {
    if (value === '') {
      setQuantities((prev) => ({ ...prev, [productId]: '' }));
      return;
    }
    const parsedValue = Math.max(Math.min(parseInt(value, 10), stock), 1);
    setQuantities((prev) => ({ ...prev, [productId]: parsedValue }));
  }, []);

  const handleAddToCart = useCallback((product) => {
    if (!product || !product._id) return;
    const qty = parseInt(quantities[product._id], 10) || 1;
    if (qty <= 0) {
      toast.warning('Please select at least 1 item');
      return;
    }

    setAddingProductId(product._id);
    dispatch(addToCart({ productId: product._id, quantity: qty }))
      .unwrap()
      .then(() => {
        toast.success('Product added to cart');
      })
      .catch((error) => {
        toast.error(error || 'Failed to add product to cart');
      })
      .finally(() => setAddingProductId(null));
  }, [dispatch, quantities]);

  const handleProductClick = useCallback((product) => {
    if (!product || (!product._id && !product.slug)) return;
    const identifier = product.slug || product._id;
    navigate(`/product/${identifier}`);
  }, [navigate]);

  const cartQuantityMap = useMemo(() => {
    const map = new Map();
    cartItems.forEach((item) => {
      const productId = item.product?._id || item.product;
      if (productId) {
        map.set(productId, item.quantity);
      }
    });
    return map;
  }, [cartItems]);

  useEffect(() => {
    if (!products || products.length === 0) return;
    setQuantities((prev) => {
      const updated = { ...prev };
      products.forEach((product) => {
        if (!product || !product._id) return;
        const cartQty = cartQuantityMap.get(product._id) || 0;
        if (!updated[product._id]) {
          updated[product._id] = cartQty > 0 ? cartQty : product.stock > 0 ? 1 : 0;
        }
      });
      return updated;
    });
  }, [cartQuantityMap, products]);

  const handleSortChange = useCallback((value) => {
    setSortBy(value);
    setPage(1);
  }, []);

  const formatCategoryLabel = useCallback((name = '') => {
    return name
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }, []);

  const getCategoryImage = useCallback((category) => {
    return category?.image || category?.picture?.secure_url || '/logo.svg';
  }, []);

  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
  }, []);

  const pageTitle = currentCategory?.name || formatBreadcrumbLabel(currentSlug || '');
  const metaDescription =
    currentCategory?.description ||
    `Shop ${pageTitle || 'category'} selections curated by Ecommerce with flexible delivery and seasonal pricing.`;
  const seoKeywords = useMemo(() => {
    const base = ['Ecommerce category', 'buy online'];
    if (pageTitle) base.push(`${pageTitle} furniture`, `${pageTitle} decor`);
    return base;
  }, [pageTitle]);
  const ogImage =
    currentCategory?.image || currentCategory?.picture?.secure_url || '/logo.jpeg';

  return (
    <>
      <SEO
        title={`${pageTitle || 'Category'} Collection`}
        description={metaDescription}
        keywords={seoKeywords}
        openGraph={{ type: 'website', image: ogImage }}
      />
      <div className="min-h-screen">
        {/* Align with Homepage Categories Strip */}
        <div className={`${isMobile ? (isScrolled ? 'bg-white border-b border-gray-200' : 'bg-primary/10 border-b border-primary/20') : 'bg-white border-b border-gray-200'} pb-0.5 sm:pb-2`}>
          <div className="max-w-[1800px] mx-auto lg:px-4">
            {/* Breadcrumbs at the top of the strip */}
            <nav className="px-2 pt-1 pb-1 sm:px-4 sm:pt-4 sm:pb-2 lg:px-6" aria-label="Category breadcrumbs">
              <ol className="flex flex-wrap items-center gap-1 text-xs font-medium text-slate-600">
                <li className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="text-slate-600 hover:text-primary transition-colors"
                  >
                    Home
                  </button>
                </li>
                {breadcrumbs.map((crumb, index) => {
                  const isLast = index === breadcrumbs.length - 1;
                  const crumbPath = buildCategoryPath(breadcrumbs.slice(0, index + 1).map(c => c.slug));
                  return (
                    <li key={`crumb-${index}`} className="flex items-center gap-1">
                      <span className="text-slate-400">/</span>
                      {isLast ? (
                        <span className="text-primary">{formatCategoryLabel(crumb.name)}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate(crumbPath)}
                          className="text-slate-600 hover:text-primary transition-colors"
                        >
                          {formatCategoryLabel(crumb.name)}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>

            {/* Category Swiper for subcategories */}
            {childCategories && childCategories.length > 0 ? (
              <div className="mt-1">
                <CategorySwiper
                  categories={[
                    // "All" tile as a virtual category for consistency
                    {
                      _id: 'all-current',
                      name: `All ${currentCategory?.name || 'Products'}`,
                      slug: currentCategory?.slug,
                      image: currentCategory?.image || currentCategory?.picture?.secure_url,
                      hasChildren: false,
                    },
                    ...childCategories.map((child) => ({
                      ...child,
                      hasChildren: Array.isArray(child.children) && child.children.length > 0,
                    }))
                  ]}
                  selectedCategory={null}
                  onCategorySelect={(cat) => {
                    if (cat._id === 'all-current') {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    } else {
                      handleNavigateToChild(cat.slug);
                    }
                  }}
                  onNavigateDown={(cat) => handleNavigateToChild(cat.slug)}
                />
              </div>
            ) : (
              <div className="h-4" /> // Spacing if no children
            )}
          </div>
        </div>

        <div className="max-w-[1800px] mx-auto px-4 py-8">

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 capitalize">
              {pageTitle}
            </h1>
            {parentCategory ? (
              <p className="text-sm text-gray-500 mt-2">
                Parent: <button
                  type="button"
                  onClick={handleNavigateToParent}
                  className="text-primary hover:underline"
                >
                  {parentCategory.name}
                </button>
              </p>
            ) : (
              <p className="text-sm text-gray-500 mt-2">Top-level category</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Select value={gridType} onValueChange={setGridType}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Grid" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid2">Grid View</SelectItem>
                <SelectItem value="grid3">List View</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <BannerCarousel placement="category_page" heightClass="h-[220px]" className="mb-8" />

       

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Products</h2>
            <div className="text-sm text-gray-500">
              Page {currentPage || page} of {totalPages || 1}
            </div>
          </div>

          <ProductGrid
            products={products}
            loading={productsStatus === 'loading'}
            gridType={gridType}
            quantities={quantities}
            onQuantityChange={handleQuantityChange}
            onAddToCart={handleAddToCart}
            addingProductId={addingProductId}
            cartItems={cartItems}
            onProductClick={handleProductClick}
          />

          <Pagination
            currentPage={currentPage || page}
            totalPages={totalPages || 1}
            onPageChange={handlePageChange}
          />
        </section>
      </div>
    </div>
    </>
  );
};

export default CategoryBrowse;

