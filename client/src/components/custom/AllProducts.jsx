import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSearch } from '@/hooks/use-search';
import { usePagination } from '@/hooks/use-pagination';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import OneLoader from '../ui/OneLoader';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import LazyImage from '../ui/LazyImage';
import SearchBar from './SearchBar';
import Pagination from './Pagination';

import {
  Trash2,
  Edit,
  Search,
  PackageSearch,
  Plus,
  X,
  Eye,
  Grid3X3,
  List,
  Filter,
  SortAsc,
  MoreVertical,
  Star,
  TrendingUp,
  BarChart3
} from 'lucide-react';

import { toast } from 'sonner';
import { AddProduct, deleteSingleProduct, fetchProducts, updateProductStock } from '@/redux/slices/products/productSlice';
import { AllCategory } from '@/redux/slices/categories/categoriesSlice';

const AllProducts = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { products, status, totalItems } = useSelector((state) => state.products);
  const { categories } = useSelector((state) => state.categories);

  // Get page number from URL params if available
  const searchParams = new URLSearchParams(location.search);
  const urlPage = searchParams.get('page');
  const initialPage = urlPage ? parseInt(urlPage, 10) : 1;

  // Use the search hook to eliminate duplication
  const search = useSearch({
    initialCategory: 'all',
    initialPage: initialPage,
    initialLimit: 24,
    initialStockFilter: 'all',
    initialSortBy: 'az'
  });

  // Use pagination hook to eliminate pagination duplication
  const pagination = usePagination({
    initialPage: initialPage,
    initialLimit: 24,
    totalItems,
    onPageChange: (page) => {
      search.handlePageChange(page);
    }
  });

  // Local state for UI-specific functionality
  const [categorySearch, setCategorySearch] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [gridType, setGridType] = useState('grid2');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Memoized combined categories
  const combinedCategories = useMemo(() => [
    { _id: 'all', name: 'All', image: 'https://cdn.pixabay.com/photo/2023/07/19/12/16/car-8136751_1280.jpg' },
    ...(categories || [])
  ], [categories]);

  // Filtered categories based on search
  const filteredCategories = useMemo(() => {
    if (!categorySearch) return combinedCategories;
    return combinedCategories.filter(cat => 
      cat.name.toLowerCase().includes(categorySearch.toLowerCase())
    );
  }, [combinedCategories, categorySearch]);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    stock: ''
  });

  // Fetch categories
  useEffect(() => {
    dispatch(AllCategory());
  }, [dispatch]);

  // Fetch products on component mount
  useEffect(() => {
    dispatch(fetchProducts({ category: 'all', searchTerm: '', page: 1, limit: 24, stockFilter: 'all' }));
  }, [dispatch]);

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
    const searchKey = `${search.debouncedSearchTerm || ''}-${search.category}-${search.stockFilter}-${search.sortBy}`;
    
    // Only call if search params actually changed
    if (lastSearchParamsRef.current !== searchKey) {
      lastSearchParamsRef.current = searchKey;
      isSearchingRef.current = true;
      
      // Use the debounced search term or empty string if no search
      const searchTermToUse = search.debouncedSearchTerm || '';
      const result = handleSearchRef.current?.(searchTermToUse);
      // Ensure we always have a promise to call finally on
      Promise.resolve(result).finally(() => {
        isSearchingRef.current = false;
      });
    }
  }, [search.debouncedSearchTerm, search.category, search.stockFilter, search.sortBy]);
  
  // Handle page changes separately (only user-initiated via pagination)
  const prevPageRef = useRef(search.page);
  useEffect(() => {
    const pageChanged = prevPageRef.current !== search.page;
    prevPageRef.current = search.page;
    
    // Only trigger search if page changed (user clicked pagination)
    // Skip if we're already searching to prevent loops
    if (pageChanged && !isSearchingRef.current) {
      isSearchingRef.current = true;
      const searchKey = `${search.debouncedSearchTerm || ''}-${search.category}-${search.stockFilter}-${search.sortBy}`;
      lastSearchParamsRef.current = searchKey;
      
      // Use the debounced search term or empty string if no search
      const searchTermToUse = search.debouncedSearchTerm || '';
      const result = handleSearchRef.current?.(searchTermToUse);
      // Ensure we always have a promise to call finally on
      Promise.resolve(result).finally(() => {
        isSearchingRef.current = false;
      });
    }
  }, [search.page, search.debouncedSearchTerm]);

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [search.page]);

  // Products are now sorted on the backend, so we use them directly
  // Use activeSearchTerm for filtering (the actual search term used for API calls)
  const sortedProducts = useMemo(() => {
    return search.filterProducts(products, search.activeSearchTerm || search.searchTerm, search.selectedProductId);
  }, [products, search.activeSearchTerm, search.searchTerm, search.selectedProductId, search.filterProducts]);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const formDataObj = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== '') {
          formDataObj.append(key, formData[key]);
        }
      });

      await dispatch(AddProduct(formDataObj)).unwrap();
      toast.success('Product added successfully!');
      setShowCreateForm(false);

      setFormData({ title: '', description: '', price: '', stock: '' });
    } catch (error) {
      toast.error(error.message || 'Something went wrong!');
    } finally {
      setIsSubmitting(false);
    }
  }, [dispatch, formData, isSubmitting]);

  // Handle product deletion
  const handleDelete = useCallback(async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await dispatch(deleteSingleProduct(productId)).unwrap();
        toast.success('Product deleted successfully!');
      } catch (error) {
        toast.error(error.message || 'Something went wrong!');
      }
    }
  }, [dispatch]);

  // Handle edit product - preserve current page number
  const handleEdit = useCallback((product) => {
    const currentPage = pagination.currentPage;
    navigate(`/admin/dashboard/update/${product._id}?page=${currentPage}`);
  }, [navigate, pagination.currentPage]);

  // Handle stock toggle
  const handleStockToggle = useCallback(async (product) => {
    try {
      const newStock = product.stock > 0 ? 0 : 1;
      await dispatch(updateProductStock({ 
        id: product._id, 
        stock: newStock 
      })).unwrap();
      
      toast.success(`Product ${newStock > 0 ? 'restocked' : 'marked as out of stock'}`);
    } catch (error) {
      toast.error(error || 'Failed to update stock status');
    }
  }, [dispatch]);


  // Handle page change using pagination hook
  const handlePageChange = useCallback((page) => {
    pagination.setCurrentPage(page);
  }, [pagination]);

  // Handle category selection
  const handleCategorySelect = useCallback((categoryId) => {
    // Don't do anything if clicking the same category
    if (search.category === categoryId) return;
    
    // Clear category search UI
    setCategorySearch('');
    
    // Reset suggestion IDs first to clear lastRequestParamsRef (this forces a new fetch)
    search.setEnterSuggestionIds([]);
    
    // Clear search state completely
    search.handleSearchChange('');
    search.setSelectedProductId(null);
    search.handleSearchSubmit('', null, []);
    
    // Reset the local refs to force a new fetch
    // This ensures the useEffect will trigger even if the search key appears the same
    lastSearchParamsRef.current = '';
    isSearchingRef.current = false;
    
    // Set the new category (this resets pagination to page 1 and resets lastRequestParamsRef in hook)
    search.setCategory(categoryId);
    
    // Manually trigger fetch after state updates to ensure it works
    // Use a small delay to ensure React has processed the state update
    setTimeout(() => {
      // Create the new search key matching the format used in useEffect
      // Format: `${debouncedSearchTerm || ''}-${category}-${stockFilter}-${sortBy}`
      const newSearchKey = `-${categoryId}-${search.stockFilter}-${search.sortBy}`;
      // Only trigger if the key is different and we're not already searching
      if (lastSearchParamsRef.current !== newSearchKey && !isSearchingRef.current) {
        lastSearchParamsRef.current = newSearchKey;
        isSearchingRef.current = true;
        const result = handleSearchRef.current?.('');
        Promise.resolve(result).finally(() => {
          isSearchingRef.current = false;
        });
      }
    }, 50);
  }, [search]);

  // Enhanced handlers for search and interactions
  const handleSearchChange = useCallback((value) => {
    search.handleSearchChange(value);
  }, [search]);

  const handleSearchSubmit = useCallback((term, productId = null) => {
    search.handleSearchWithTracking(term, productId);
  }, [search]);


  const handleGridTypeChange = useCallback((type) => {
    setGridType(type);
  }, []);

  const handlePreviewImage = useCallback((image) => {
    setPreviewImage(image);
  }, []);

  // Only show main loader for initial loading, not for search/filter operations
  if (status === 'loading' && products.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <OneLoader size="large" text="Loading Products..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Professional Header with Stats */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-blue-600 bg-clip-text text-transparent">
                Product Management
              </h1>
              <p className="text-gray-600 text-lg">Manage your product catalog with advanced tools</p>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <PackageSearch className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
                    <p className="text-sm text-gray-500">Total Products</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {products.filter(p => p.stock > 0).length}
                    </p>
                    <p className="text-sm text-gray-500">In Stock</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {products.filter(p => p.stock === 0).length}
                    </p>
                    <p className="text-sm text-gray-500">Out of Stock</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Star className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{categories?.length || 0}</p>
                    <p className="text-sm text-gray-500">Categories</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Professional Search and Filter Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
            {/* Enhanced Search Bar with Suggestions */}
            <div className="flex-1 min-w-0">
              <SearchBar
                searchTerm={search.searchTerm}
                onSearchChange={handleSearchChange}
                onSearchSubmit={handleSearchSubmit}
                gridType={gridType}
                onGridTypeChange={handleGridTypeChange}
                products={products}
                searchHistory={[]}
                popularSearches={[]}
              />
            </div>
            
            {/* Filter Controls - Fixed Alignment */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              {/* Category Filter */}
              <div className="flex-1 sm:min-w-[180px]">
                <Select value={search.category} onValueChange={handleCategorySelect}>
                  <SelectTrigger className="h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <SelectValue placeholder="All Categories" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-3">
                      <Input
                        placeholder="Search categories..."
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        className="mb-3"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    {filteredCategories.map((cat) => (
                      <SelectItem key={cat._id} value={cat._id} className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Stock Filter */}
              <div className="flex-1 sm:min-w-[140px]">
                <Select value={search.stockFilter} onValueChange={search.setStockFilter}>
                  <SelectTrigger className="h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <SelectValue placeholder="Stock Status" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    <SelectItem value="active">In Stock</SelectItem>
                    <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Sort Filter */}
              <div className="flex-1 sm:min-w-[140px]">
                <Select value={search.sortBy} onValueChange={search.setSortBy}>
                  <SelectTrigger className="h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200">
                    <div className="flex items-center gap-2">
                      <SortAsc className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <SelectValue placeholder="Sort By" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="az">Name A-Z</SelectItem>
                    <SelectItem value="za">Name Z-A</SelectItem>
                    <SelectItem value="price-low">Price Low-High</SelectItem>
                    <SelectItem value="price-high">Price High-Low</SelectItem>
                    <SelectItem value="stock">Stock Level</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
            </div>
          </div>
        </div>
      
        {/* Professional Products Grid */}
        <div className="space-y-6">
          {/* Results Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-gray-900">
                Products ({sortedProducts.length})
              </h2>
              {search.searchTerm && (
                <Badge variant="secondary" className="px-3 py-1">
                  Search: "{search.searchTerm}"
                </Badge>
              )}
              {search.stockFilter !== 'all' && (
                <Badge variant="outline" className="px-3 py-1">
                  {search.stockFilter === 'active' ? 'In Stock' : 'Out of Stock'}
                </Badge>
              )}
            </div>
            
          </div>

          {/* Products Grid */}
          <div className={`grid gap-6 ${
            gridType === 'grid2' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
              : 'grid-cols-1'
          }`}>
            {sortedProducts.map((product) => (
              <Card 
                key={product._id} 
                className={`group relative overflow-hidden bg-white border-0 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 ${
                  gridType === 'grid3' ? 'flex flex-row items-center gap-6 p-6' : 'p-0'
                }`}
              >
                {/* Product Image */}
                <div className={`relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 transition-all duration-500 group-hover:scale-105 cursor-pointer ${
                  gridType === 'grid3' 
                    ? 'w-20 h-20 flex-shrink-0 rounded-xl' 
                    : 'aspect-square w-full'
                }`}
                onClick={() => handlePreviewImage(product.image || product.picture?.secure_url)}
                >
                  <LazyImage
                    src={product.image || product.picture?.secure_url}
                    alt={product.title}
                    className="w-full h-full object-cover"
                    fallback="/logo.jpeg"
                    quality={90}
                  />
                  
                  {/* Stock Badge */}
                  <div className="absolute top-3 right-3">
                    <Badge 
                      variant={product.stock > 0 ? 'default' : 'destructive'}
                      className={`px-3 py-1 text-xs font-medium ${
                        product.stock > 0 
                          ? 'bg-green-100 text-green-800 border-green-200' 
                          : 'bg-red-100 text-red-800 border-red-200'
                      }`}
                    >
                      {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                    </Badge>
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                      <Eye className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>

                {/* Product Info */}
                <div className={`${gridType === 'grid3' ? 'flex-1 space-y-3' : 'p-6 space-y-4'}`}>
                  <div className="space-y-2">
                    <h3 className="font-bold text-lg text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors duration-200">
                      {product.title}
                    </h3>
                    
                    <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-2xl font-bold text-gray-900">
                        PKR {product.price?.toLocaleString()}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                        <span className="text-sm text-gray-500">
                          Stock: {product.stock}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(product)}
                        className="flex-1 h-10 rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(product._id)}
                        className="h-10 px-3 rounded-lg border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all duration-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Stock Toggle */}
                    <Button
                      variant={product.stock > 0 ? "outline" : "default"}
                      size="sm"
                      onClick={() => handleStockToggle(product)}
                      className={`w-full h-10 rounded-lg transition-all duration-200 ${
                        product.stock > 0 
                          ? 'border-2 border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300' 
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {product.stock > 0 ? 'Mark Out of Stock' : 'Mark In Stock'}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Professional Pagination */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mt-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{pagination.startItem}</span> to{' '}
              <span className="font-semibold text-gray-900">{pagination.endItem}</span> of{' '}
              <span className="font-semibold text-gray-900">{totalItems}</span> products
              {pagination.totalPages > 1 && (
                <span className="ml-2 text-gray-500">
                  (Page {pagination.currentPage} of {pagination.totalPages})
                </span>
              )}
            </div>
            
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        </div>

        {/* Professional Empty State */}
        {sortedProducts.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <PackageSearch className="h-12 w-12 text-blue-600" />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {search.searchTerm || search.stockFilter !== 'all' 
                  ? 'No products match your criteria' 
                  : 'No products found'
                }
              </h3>
              
              <p className="text-gray-600 mb-8 leading-relaxed">
                {search.searchTerm || search.stockFilter !== 'all'
                  ? 'Try adjusting your search terms or filters to find what you\'re looking for.'
                  : 'Get started by adding your first product to build your catalog.'
                }
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {search.searchTerm || search.stockFilter !== 'all' ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        search.clearSearch();
                        search.setStockFilter('all');
                      }}
                      className="px-6 py-3 rounded-xl"
                    >
                      Clear Filters
                    </Button>
                    <Button
                      onClick={() => setShowCreateForm(true)}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Product
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => setShowCreateForm(true)}
                    className="px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Create Your First Product
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Professional Image Preview Modal */}
        {previewImage && (
          <div
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center px-4"
            onClick={() => setPreviewImage(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Product image preview"
          >
            <div
              className="relative w-full max-w-6xl max-h-[95vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden">
                <img
                  src={previewImage}
                  alt="Product Preview"
                  className="object-contain w-full h-auto max-h-[90vh]"
                  loading="eager"
                />
                <button
                  onClick={() => setPreviewImage(null)}
                  className="absolute top-4 right-4 bg-white/90 hover:bg-red-500 hover:text-white text-gray-700 rounded-full p-2 transition-all duration-200 shadow-lg"
                  aria-label="Close preview"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Professional Create Product Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Create New Product</h2>
                    <p className="text-blue-100 mt-1">Add a new product to your catalog</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowCreateForm(false);
                      setFormData({ title: '', description: '', price: '', stock: '' });
                    }}
                    className="text-white hover:bg-white/20 rounded-full p-2"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-8 max-h-[calc(95vh-120px)] overflow-y-auto">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-sm font-semibold text-gray-700">
                        Product Title *
                      </Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Enter product title"
                        required
                        className="h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="price" className="text-sm font-semibold text-gray-700">
                        Price (PKR) *
                      </Label>
                      <Input
                        id="price"
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="0.00"
                        required
                        className="h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-semibold text-gray-700">
                      Description *
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe your product..."
                      required
                      rows={4}
                      className="border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stock" className="text-sm font-semibold text-gray-700">
                      Stock Quantity *
                    </Label>
                    <Input
                      id="stock"
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      placeholder="Enter stock quantity"
                      required
                      className="h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCreateForm(false);
                        setFormData({ title: '', description: '', price: '', stock: '' });
                      }}
                      className="flex-1 h-12 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all duration-200"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="flex-1 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Creating...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Create Product
                        </div>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default React.memo(AllProducts);