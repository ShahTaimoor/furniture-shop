import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSearch } from '@/hooks/use-search';
import { usePagination } from '@/hooks/use-pagination';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DataTable } from './data-table/DataTable';
import { DataTablePagination } from './data-table/DataTablePagination';
import { DataTableToolbar } from './data-table/DataTableToolbar';
import { useDataTable } from './data-table/useDataTable';
import { buildProductColumns } from './data-table/products-columns';

import {
  Search,
  PackageSearch,
  X,
  Filter,
  SortAsc,
  TrendingUp,
} from 'lucide-react';

import { toast } from 'sonner';
import { deleteSingleProduct, fetchProducts, updateProductStock } from '@/redux/slices/products/productSlice';
import { AllCategory } from '@/redux/slices/categories/categoriesSlice';
import { selectCurrency } from '@/redux/slices/settings/settingsSlice';

const AllProducts = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { products, status, totalItems } = useSelector((state) => state.products);
  const { categories } = useSelector((state) => state.categories);
  const currency = useSelector(selectCurrency);

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
  const [previewImage, setPreviewImage] = useState(null);
  const [rowSelection, setRowSelection] = useState({});

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
  const sortedProducts = useMemo(() => {
    return search.filterProducts(products, search.activeSearchTerm || search.searchTerm, search.selectedProductId);
  }, [products, search.activeSearchTerm, search.searchTerm, search.selectedProductId, search.filterProducts]);

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
    lastSearchParamsRef.current = '';
    isSearchingRef.current = false;

    // Set the new category (this resets pagination to page 1 and resets lastRequestParamsRef in hook)
    search.setCategory(categoryId);

    setTimeout(() => {
      const newSearchKey = `-${categoryId}-${search.stockFilter}-${search.sortBy}`;
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

  const handleSearchChange = useCallback((value) => {
    search.handleSearchChange(value);
  }, [search]);

  const handleSearchKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      search.handleSearchSubmit(search.searchTerm);
    }
  }, [search]);

  const handlePreviewImage = useCallback((image) => {
    setPreviewImage(image);
  }, []);

  const productColumns = useMemo(() => buildProductColumns({
    onEdit: handleEdit,
    onDelete: handleDelete,
    onToggleStock: handleStockToggle,
    onPreviewImage: handlePreviewImage,
    currency,
  }), [handleEdit, handleDelete, handleStockToggle, handlePreviewImage, currency]);

  const table = useDataTable({
    columns: productColumns,
    data: sortedProducts,
    manualPagination: true,
    pageCount: pagination.totalPages || 1,
    rowSelection,
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row._id,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        <p className="text-sm text-muted-foreground">
          {totalItems} product{totalItems === 1 ? '' : 's'} in your catalog
        </p>
      </div>

      <DataTableToolbar
        left={
          <>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search.searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search products... (Enter to search)"
                className="pl-8"
              />
            </div>

            <Select value={search.category} onValueChange={handleCategorySelect}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    placeholder="Search categories..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                {filteredCategories.map((cat) => (
                  <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={search.stockFilter} onValueChange={search.setStockFilter}>
              <SelectTrigger className="w-[150px]">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="active">In Stock</SelectItem>
                <SelectItem value="out-of-stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>

            <Select value={search.sortBy} onValueChange={search.setSortBy}>
              <SelectTrigger className="w-[160px]">
                <SortAsc className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="az">Name A-Z</SelectItem>
                <SelectItem value="za">Name Z-A</SelectItem>
                <SelectItem value="price-low">Price Low-High</SelectItem>
                <SelectItem value="price-high">Price High-Low</SelectItem>
                <SelectItem value="stock">Stock Level</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      <DataTable table={table} isLoading={status === 'loading' && products.length === 0} />

      <DataTablePagination mode="server" pager={pagination} selectedCount={Object.keys(rowSelection).length} />

      {sortedProducts.length === 0 && status !== 'loading' && (
        <div className="rounded-lg border p-12 text-center">
          <PackageSearch className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-semibold">
            {search.searchTerm || search.stockFilter !== 'all' ? 'No products match your criteria' : 'No products found'}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {search.searchTerm || search.stockFilter !== 'all'
              ? "Try adjusting your search terms or filters."
              : 'Get started by adding your first product.'}
          </p>
          {(search.searchTerm || search.stockFilter !== 'all') && (
            <div className="mt-6 flex justify-center">
              <Button variant="outline" onClick={() => { search.clearSearch(); search.setStockFilter('all'); }}>
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 px-4 backdrop-blur-md"
          onClick={() => setPreviewImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Product image preview"
        >
          <div className="relative flex max-h-[95vh] w-full max-w-6xl items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <div className="relative overflow-hidden rounded-2xl bg-background shadow-2xl">
              <img src={previewImage} alt="Product Preview" className="max-h-[90vh] w-full object-contain" loading="eager" />
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 rounded-full bg-background/90 p-2 text-foreground shadow-lg transition-all hover:bg-foreground hover:text-background"
                aria-label="Close preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default React.memo(AllProducts);
