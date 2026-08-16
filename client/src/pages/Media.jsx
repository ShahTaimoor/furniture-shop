import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts } from '@/redux/slices/products/productSlice';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import LazyImage from '../components/ui/LazyImage';
import Pagination from '../components/custom/Pagination';
import SearchBar from '../components/custom/SearchBar';
import { useSearch } from '@/hooks/use-search';
import { usePagination } from '@/hooks/use-pagination';
import { Eye, Download, Filter, FileDown, Plus, X, Upload, Trash2, CheckSquare, Square, Image, Upload as UploadIcon } from 'lucide-react';
import { toast } from 'sonner';
import axiosInstance from '@/redux/slices/auth/axiosInstance';
import SEO from '@/components/seo/SEO';

const Media = () => {
  const dispatch = useDispatch();
  const { products, status, totalItems } = useSelector((state) => state.products);
  const seoElement = (
    <SEO
      title="Media Library"
      description="Upload, organise, and export Ecommerce product imagery directly from the admin media workspace."
      keywords={['media manager', 'product images', 'Ecommerce admin']}
      noIndex
    />
  );
  
  // Use the search hook to eliminate duplication
  const search = useSearch({
    initialCategory: 'all',
    initialPage: 1,
    initialLimit: 24,
    initialStockFilter: 'all',
    initialSortBy: 'az'
  });

  // Use pagination hook to eliminate pagination duplication
  const pagination = usePagination({
    initialPage: 1,
    initialLimit: 24,
    totalItems,
    onPageChange: (page) => {
      search.handlePageChange(page);
    }
  });

  // Local state for UI-specific functionality
  const [activeTab, setActiveTab] = useState('gallery');
  const [previewImage, setPreviewImage] = useState(null);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  
  // Separate state for uploaded media display in Upload tab
  const [filteredUploadedMedia, setFilteredUploadedMedia] = useState([]);
  const [uploadSearchTerm, setUploadSearchTerm] = useState(''); // Search term for uploaded media
  
  // Pagination state for Upload tab
  const [uploadCurrentPage, setUploadCurrentPage] = useState(1);
  const [uploadPageSize, setUploadPageSize] = useState(24); // Set back to 24 per page as requested
  const [uploadTotalPages, setUploadTotalPages] = useState(1);
  const [showAllImages, setShowAllImages] = useState(false); // Option to show all images without pagination

  // Fetch media from database
  const fetchMedia = useCallback(async () => {
    setMediaLoading(true);
    try {
      // Request up to 2000 images from backend
      const response = await axiosInstance.get('/pg/media?limit=2000');
      
      if (response.data.success) {
        setUploadedMedia(response.data.data);
      } else {
        console.error('Media fetch failed:', response.data.message);
        toast.error('Failed to fetch media: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error fetching media:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      toast.error('Failed to fetch media: ' + (error.response?.data?.message || error.message));
    } finally {
      setMediaLoading(false);
    }
  }, []);

  // Fetch media on component mount
  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  // Fetch products with debounced search using the hook
  useEffect(() => {
    search.handleSearch(search.debouncedSearchTerm);
  }, [search.debouncedSearchTerm, search.page, search.category, search.handleSearch]);

  // Filter products to show only those with images and apply search filtering
  useEffect(() => {
    
    // For Gallery tab: Show only product images (no uploaded media)
    let filtered = products.filter(product => 
      product && 
      product._id && 
      (product.picture?.secure_url || product.image)
    );


    // Apply search filtering using the hook
    // Use activeSearchTerm (actual search term) instead of searchTerm (input value)
    const searchFiltered = search.filterProducts(filtered, search.activeSearchTerm || search.searchTerm, search.selectedProductId);
    setFilteredProducts(searchFiltered);
  }, [products, search.activeSearchTerm, search.searchTerm, search.selectedProductId, search.filterProducts]);

  // Filter uploaded media for Upload tab with pagination and search
  useEffect(() => {
    
    // First apply search filter
    let searchFiltered = uploadedMedia;
    if (uploadSearchTerm && uploadSearchTerm.trim()) {
      const searchLower = uploadSearchTerm.toLowerCase();
      searchFiltered = uploadedMedia.filter(media => 
        media.name?.toLowerCase().includes(searchLower) ||
        media.originalName?.toLowerCase().includes(searchLower) ||
        media.url?.toLowerCase().includes(searchLower)
      );
    }
    
    if (showAllImages) {
      // Show all filtered images without pagination
      setFilteredUploadedMedia(searchFiltered);
      setUploadTotalPages(1);
    } else {
      // Calculate pagination
      const totalPages = Math.ceil(searchFiltered.length / uploadPageSize);
      setUploadTotalPages(totalPages);
      
      // Get current page items
      const startIndex = (uploadCurrentPage - 1) * uploadPageSize;
      const endIndex = startIndex + uploadPageSize;
      const paginatedMedia = searchFiltered.slice(startIndex, endIndex);
      
      setFilteredUploadedMedia(paginatedMedia);
    }
  }, [uploadedMedia, uploadCurrentPage, uploadPageSize, showAllImages, uploadSearchTerm]);

  const handlePreviewImage = useCallback((imageUrl) => {
    setPreviewImage(imageUrl);
  }, []);

  const handleDownloadImage = useCallback(async (imageUrl, productTitle) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${productTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Image downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download image');
    }
  }, []);

  const handleSearchChange = useCallback((value) => {
    search.handleSearchChange(value);
  }, [search]);

  const handleSearchSubmit = useCallback((term, productId = null) => {
    search.handleSearchWithTracking(term, productId);
  }, [search]);

  // Upload tab search handlers
  const handleUploadSearchChange = useCallback((value) => {
    setUploadSearchTerm(value);
    setUploadCurrentPage(1); // Reset to first page when searching
  }, []);

  const handleUploadSearchSubmit = useCallback((term) => {
    setUploadSearchTerm(term);
    setUploadCurrentPage(1); // Reset to first page when searching
  }, []);

  const handlePageChange = useCallback((page) => {
    pagination.setCurrentPage(page);
  }, [pagination]);

  const handleUploadPageChange = useCallback((page) => {
    setUploadCurrentPage(page);
  }, []);

  // Reset upload page when switching to upload tab
  useEffect(() => {
    if (activeTab === 'upload') {
      setUploadCurrentPage(1);
      setShowAllImages(false); // Reset to paginated view when switching to upload tab
    }
  }, [activeTab]);

  // Delete functionality
  const handleDeleteSingle = useCallback(async (itemId) => {
    setIsDeleting(true);
    try {
      const response = await axiosInstance.delete(`/pg/media/${itemId}`);
      
      if (response.data.success) {
        toast.success('Media deleted successfully');
        // Refresh media list
        await fetchMedia();
        // Remove from selected items if it was selected
        setSelectedItems(prev => prev.filter(id => id !== itemId));
      } else {
        throw new Error(response.data.message || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete media: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsDeleting(false);
    }
  }, [fetchMedia]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedItems.length === 0) {
      toast.error('No items selected for deletion');
      return;
    }

    setIsDeleting(true);
    try {
      const response = await axiosInstance.delete('/pg/media/bulk', {
        data: { ids: selectedItems }
      });
      
      if (response.data.success) {
        toast.success(`Successfully deleted ${response.data.data.deletedCount} media items`);
        // Refresh media list
        await fetchMedia();
        // Clear selection
        setSelectedItems([]);
        setDeleteMode(false);
        setShowDeleteModal(false);
      } else {
        throw new Error(response.data.message || 'Bulk delete failed');
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Failed to delete media: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsDeleting(false);
    }
  }, [selectedItems, fetchMedia]);

  const handleSelectItem = useCallback((itemId) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedItems.length === filteredUploadedMedia.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredUploadedMedia.map(item => item._id));
    }
  }, [selectedItems.length, filteredUploadedMedia]);

  const toggleDeleteMode = useCallback(() => {
    setDeleteMode(prev => !prev);
    if (deleteMode) {
      setSelectedItems([]);
    }
  }, [deleteMode]);

  // Import functionality
  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  }, []);

  const handleImport = useCallback(async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select files to import');
      return;
    }

    // Check for duplicate names before uploading
    const duplicateNames = [];
    const existingNames = uploadedMedia.map(media => media.name?.toLowerCase());
    
    selectedFiles.forEach(file => {
      const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
      const sanitizedName = fileName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      
      if (existingNames.includes(sanitizedName)) {
        duplicateNames.push(file.name);
      }
    });

    if (duplicateNames.length > 0) {
      toast.error(`Files with these names already exist: ${duplicateNames.join(', ')}`);
      return;
    }

    setIsImporting(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach((file, index) => {
        formData.append('images', file);
      });

      const response = await axiosInstance.post('/pg/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        toast.success(`Successfully uploaded ${response.data.data.length} images to Cloudinary`);
        // Refresh media list from database
        await fetchMedia();
        setShowImportModal(false);
        setSelectedFiles([]);
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }
    } catch (error) {
      toast.error('Failed to upload images: ' + (error.response?.data?.message || error.message));
      console.error('Upload error:', error);
    } finally {
      setIsImporting(false);
    }
  }, [selectedFiles, fetchMedia, uploadedMedia]);

  // Export functionality for uploaded media
  const handleUploadExport = useCallback(async () => {
    setIsExporting(true);
    try {
      try {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        
        // Show progress
        toast.info(`Starting export of ${filteredUploadedMedia.length} uploaded images...`);
        
        // Fetch images in parallel batches for better performance
        const batchSize = 5; // Process 5 images at a time
        let processedCount = 0;
        
        for (let i = 0; i < filteredUploadedMedia.length; i += batchSize) {
          const batch = filteredUploadedMedia.slice(i, i + batchSize);
          
          // Process batch in parallel
          const batchPromises = batch.map(async (media, batchIndex) => {
            const imageUrl = media.url;
            
            if (imageUrl) {
              try {
                const response = await fetch(imageUrl, {
                  // Add timeout to prevent hanging
                  signal: AbortSignal.timeout(10000) // 10 second timeout
                });
                
                if (!response.ok) {
                  throw new Error(`HTTP ${response.status}`);
                }
                
                const blob = await response.blob();
                const fileName = `${media.name?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || `uploaded_${i + batchIndex + 1}`}.jpg`;
                return { fileName, blob, success: true };
              } catch (error) {
                console.warn(`Failed to fetch image for ${media.name}:`, error);
                return { fileName: null, blob: null, success: false };
              }
            }
            return { fileName: null, blob: null, success: false };
          });
          
          // Wait for batch to complete
          const batchResults = await Promise.all(batchPromises);
          
          // Add successful results to zip
          batchResults.forEach(({ fileName, blob, success }) => {
            if (success && fileName && blob) {
              zip.file(fileName, blob);
            }
          });
          
          processedCount += batch.length;
          
          // Update progress
          const progress = Math.round((processedCount / filteredUploadedMedia.length) * 100);
          toast.info(`Exporting... ${progress}% (${processedCount}/${filteredUploadedMedia.length})`);
        }

        // Generate zip with progress indication
        toast.info('Creating ZIP file...');
        const zipBlob = await zip.generateAsync({ 
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 } // Balanced compression
        });
        
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `uploaded_media_export_${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success(`Successfully exported ${filteredUploadedMedia.length} uploaded images as ZIP`);
      } catch (zipError) {
        console.error('ZIP creation failed:', zipError);
        
        // Fallback: download images individually with progress
        toast.info('ZIP creation failed, downloading images individually...');
        
        for (let i = 0; i < filteredUploadedMedia.length; i++) {
          const media = filteredUploadedMedia[i];
          const imageUrl = media.url;
          
          if (imageUrl) {
            try {
              const response = await fetch(imageUrl, {
                signal: AbortSignal.timeout(5000) // 5 second timeout for individual downloads
              });
              const blob = await response.blob();
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              const fileName = `${media.name?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || `uploaded_${i + 1}`}.jpg`;
              link.download = fileName;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
              
              // Show progress for individual downloads
              if ((i + 1) % 5 === 0 || i === filteredUploadedMedia.length - 1) {
                toast.info(`Downloaded ${i + 1}/${filteredUploadedMedia.length} images`);
              }
            } catch (error) {
              console.warn(`Failed to fetch image for ${media.name}:`, error);
            }
          }
        }
        toast.success(`Successfully exported ${filteredUploadedMedia.length} uploaded images individually`);
      }

      setShowExportModal(false);
    } catch (error) {
      toast.error('Failed to export uploaded images');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  }, [filteredUploadedMedia]);

  // Export functionality
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      try {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        
        // Show progress
        toast.info(`Starting export of ${filteredProducts.length} images...`);
        
        // Fetch images in parallel batches for better performance
        const batchSize = 5; // Process 5 images at a time
        let processedCount = 0;
        
        for (let i = 0; i < filteredProducts.length; i += batchSize) {
          const batch = filteredProducts.slice(i, i + batchSize);
          
          // Process batch in parallel
          const batchPromises = batch.map(async (product, batchIndex) => {
            const imageUrl = product.picture?.secure_url || product.image;
            
            if (imageUrl) {
              try {
                const response = await fetch(imageUrl, {
                  // Add timeout to prevent hanging
                  signal: AbortSignal.timeout(10000) // 10 second timeout
                });
                
                if (!response.ok) {
                  throw new Error(`HTTP ${response.status}`);
                }
                
                const blob = await response.blob();
                const fileName = `${product.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || `product_${i + batchIndex + 1}`}.jpg`;
                return { fileName, blob, success: true };
              } catch (error) {
                console.warn(`Failed to fetch image for ${product.title}:`, error);
                return { fileName: null, blob: null, success: false };
              }
            }
            return { fileName: null, blob: null, success: false };
          });
          
          // Wait for batch to complete
          const batchResults = await Promise.all(batchPromises);
          
          // Add successful results to zip
          batchResults.forEach(({ fileName, blob, success }) => {
            if (success && fileName && blob) {
              zip.file(fileName, blob);
            }
          });
          
          processedCount += batch.length;
          
          // Update progress
          const progress = Math.round((processedCount / filteredProducts.length) * 100);
          toast.info(`Exporting... ${progress}% (${processedCount}/${filteredProducts.length})`);
        }

        // Generate zip with progress indication
        toast.info('Creating ZIP file...');
        const zipBlob = await zip.generateAsync({ 
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 } // Balanced compression
        });
        
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `media_export_${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success(`Successfully exported ${filteredProducts.length} images as ZIP`);
      } catch (zipError) {
        console.error('ZIP creation failed:', zipError);
        
        // Fallback: download images individually with progress
        toast.info('ZIP creation failed, downloading images individually...');
        
        for (let i = 0; i < filteredProducts.length; i++) {
          const product = filteredProducts[i];
          const imageUrl = product.picture?.secure_url || product.image;
          
          if (imageUrl) {
            try {
              const response = await fetch(imageUrl, {
                signal: AbortSignal.timeout(5000) // 5 second timeout for individual downloads
              });
              const blob = await response.blob();
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              const fileName = `${product.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || `product_${i + 1}`}.jpg`;
              link.download = fileName;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
              
              // Show progress for individual downloads
              if ((i + 1) % 5 === 0 || i === filteredProducts.length - 1) {
                toast.info(`Downloaded ${i + 1}/${filteredProducts.length} images`);
              }
            } catch (error) {
              console.warn(`Failed to fetch image for ${product.title}:`, error);
            }
          }
        }
        toast.success(`Successfully exported ${filteredProducts.length} images individually`);
      }

      setShowExportModal(false);
    } catch (error) {
      toast.error('Failed to export images');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  }, [filteredProducts]);

  // Only show main loader for initial loading, not for search/filter operations
  if (status === 'loading' && products.length === 0) {
    return (
      <>
        {seoElement}
        <div className="p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {seoElement}
      <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Media Gallery</h1>
        <p className="text-gray-600">Browse and manage all product images</p>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="gallery" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Gallery
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <UploadIcon className="h-4 w-4" />
            Upload
          </TabsTrigger>
        </TabsList>

        {/* Gallery Tab */}
        <TabsContent value="gallery" className="space-y-6">
          {/* Enhanced Search Bar */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              {/* Enhanced Search Bar */}
              <div className="flex-1">
                <SearchBar
                  searchTerm={search.searchTerm}
                  onSearchChange={handleSearchChange}
                  onSearchSubmit={handleSearchSubmit}
                  searchHistory={search.searchHistory}
                  popularSearches={search.popularSearches}
                  products={search.allProducts}
                />
              </div>

              {/* Gallery Actions - Export Button */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowExportModal(true)}
                  className="flex items-center gap-2 transition-all duration-200 hover:bg-green-50 hover:border-green-300"
                >
                  <FileDown className="h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
          </div>

          {/* Results Info */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {filteredProducts.length} product images
                {search.searchTerm && ` for "${search.searchTerm}"`}
                {mediaLoading && (
                  <span className="ml-2 text-blue-600 animate-pulse">
                    Loading images...
                  </span>
                )}
              </p>
              
            </div>
            
            <p className="text-xs text-gray-500 mt-1">
              Product images from your inventory
            </p>
          </div>

          {/* Media Grid - Image Only */}
          {filteredProducts.length > 0 ? (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
              {filteredProducts.map((product) => (
                <div 
                  key={product._id} 
                  className="relative group transition-all duration-300 hover:scale-105"
                >

                  {/* Product Image Only */}
                  <div className="relative aspect-square bg-gray-50 overflow-hidden rounded-lg transition-transform duration-300 hover:scale-105 cursor-pointer w-full"
                  onClick={() => handlePreviewImage(product.picture?.secure_url || product.image)}
                  >
                    <LazyImage
                      src={product.picture?.secure_url || product.image}
                      alt={product.title || 'Product Image'}
                      className="w-full h-full object-cover"
                      fallback="/logo.svg"
                      quality={85}
                    />

                    {/* Product Image Indicator */}
                    <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <Image className="h-3 w-3" />
                      Product
                    </div>

                    {/* Hover overlay with actions */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreviewImage(product.picture?.secure_url || product.image);
                        }}
                        className="bg-white/90 hover:bg-white text-black"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadImage(product.picture?.secure_url || product.image, product.title || 'product');
                        }}
                        className="bg-white/90 hover:bg-white text-black"
                      >
                        <Download className="h-4 w-4" />
                      </Button>

                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Filter className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No images found</h3>
              <p className="text-gray-500">
                {search.searchTerm
                  ? 'Try adjusting your search criteria'
                  : 'No product images available'}
              </p>
            </div>
          )}

          {/* Pagination */}
          {filteredProducts.length > 0 && pagination.totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </TabsContent>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Upload Images</h2>
                <p className="text-gray-600">Upload new images to your media library</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowExportModal(true)}
                  className="flex items-center gap-2 transition-all duration-200 hover:bg-green-50 hover:border-green-300"
                >
                  <FileDown className="h-4 w-4" />
                  Export
                </Button>

                <Button
                  variant={deleteMode ? "destructive" : "outline"}
                  onClick={toggleDeleteMode}
                  className="flex items-center gap-2 transition-all duration-200 hover:bg-black/10 hover:border-black"
                >
                  <Trash2 className="h-4 w-4" />
                  {deleteMode ? 'Cancel Delete' : 'Delete Mode'}
                </Button>

                {deleteMode && selectedItems.length > 0 && (
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteModal(true)}
                    className="flex items-center gap-2 transition-all duration-200"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Selected ({selectedItems.length})
                  </Button>
                )}

                <Button
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-2 transition-all duration-200 hover:scale-105 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Upload className="h-4 w-4" />
                  Upload Images
                </Button>
              </div>
            </div>

            {/* Search Bar for Upload Tab */}
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
              <div className="flex flex-col lg:flex-row gap-4 items-center">
                <div className="flex-1">
                  <SearchBar
                    searchTerm={uploadSearchTerm}
                    onSearchChange={handleUploadSearchChange}
                    onSearchSubmit={handleUploadSearchSubmit}
                    searchHistory={[]}
                    popularSearches={[]}
                    products={[]}
                  />
                </div>
              </div>
            </div>

            {/* Upload Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <Upload className="h-5 w-5 text-blue-600 mt-0.5" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-blue-900 mb-1">Upload Guidelines</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Supported formats: JPG, PNG, GIF, WebP</li>
                    <li>• Images will be automatically converted to WebP for optimization</li>
                    <li>• Maximum file size: 10MB per image</li>
                    <li>• Images are uploaded to Cloudinary for fast delivery</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Quick Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                 onClick={() => setShowImportModal(true)}>
              <div className="flex flex-col items-center gap-4">
                <div className="bg-blue-100 rounded-full p-4">
                  <Upload className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Drop images here or click to upload</h3>
                  <p className="text-gray-600">Select multiple images to upload at once</p>
                </div>
              </div>
            </div>

            {/* Uploaded Media Grid */}
            {filteredUploadedMedia.length > 0 ? (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Uploaded Images</h3>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      Showing {filteredUploadedMedia.length} of {uploadedMedia.length} images
                      {uploadSearchTerm && ` for "${uploadSearchTerm}"`}
                    </span>
                    {!showAllImages && uploadTotalPages > 1 && (
                      <span className="text-sm text-gray-500">
                        Page {uploadCurrentPage} of {uploadTotalPages}
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      <Button
                        variant={showAllImages ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setShowAllImages(!showAllImages);
                          setUploadCurrentPage(1);
                        }}
                        className="text-xs"
                      >
                        {showAllImages ? 'Show Paginated' : 'Show All'}
                      </Button>
                      {!showAllImages && (
                        <select
                          value={uploadPageSize}
                          onChange={(e) => {
                            setUploadPageSize(Number(e.target.value));
                            setUploadCurrentPage(1);
                          }}
                          className="text-xs border border-gray-300 rounded px-2 py-1"
                        >
                          <option value={12}>12 per page</option>
                          <option value={24}>24 per page</option>
                          <option value={48}>48 per page</option>
                          <option value={96}>96 per page</option>
                        </select>
                      )}
                      {deleteMode && filteredUploadedMedia.length > 0 && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleSelectAll}
                            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                          >
                            {selectedItems.length === filteredUploadedMedia.length ? (
                              <CheckSquare className="h-4 w-4 text-blue-600" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                            {selectedItems.length === filteredUploadedMedia.length ? 'Deselect All' : 'Select All'}
                          </button>
                          {selectedItems.length > 0 && (
                            <span className="text-sm text-black font-medium">
                              {selectedItems.length} selected
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {filteredUploadedMedia.map((media) => (
                    <div key={media._id} className="relative group">
                      {/* Selection Checkbox */}
                      {deleteMode && (
                        <div className="absolute top-2 right-2 z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectItem(media._id);
                            }}
                            className="bg-white/90 hover:bg-white rounded-full p-1 shadow-md transition-all"
                          >
                            {selectedItems.includes(media._id) ? (
                              <CheckSquare className="h-4 w-4 text-blue-600" />
                            ) : (
                              <Square className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                      )}

                      <div className="aspect-square bg-gray-50 overflow-hidden rounded-lg cursor-pointer"
                           onClick={() => handlePreviewImage(media.url)}>
                        <LazyImage
                          src={media.url}
                          alt={media.name || 'Uploaded Image'}
                          className="w-full h-full object-cover"
                          fallback="/logo.svg"
                          quality={85}
                        />
                        <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <Upload className="h-3 w-3" />
                          Uploaded
                        </div>
                        
                        {/* Hover overlay with actions */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreviewImage(media.url);
                            }}
                            className="bg-white/90 hover:bg-white text-black"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadImage(media.url, media.name || 'uploaded-image');
                            }}
                            className="bg-white/90 hover:bg-white text-black"
                          >
                            <Download className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('Are you sure you want to delete this uploaded image?')) {
                                handleDeleteSingle(media._id);
                              }
                            }}
                            className="bg-black hover:bg-black/80 text-white"
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Upload Pagination */}
                {!showAllImages && uploadTotalPages > 1 && (
                  <div className="mt-8">
                    <Pagination
                      currentPage={uploadCurrentPage}
                      totalPages={uploadTotalPages}
                      onPageChange={handleUploadPageChange}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-8 text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Upload className="h-16 w-16 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {uploadSearchTerm ? 'No images found' : 'No uploaded images yet'}
                </h3>
                <p className="text-gray-500">
                  {uploadSearchTerm 
                    ? 'Try adjusting your search criteria' 
                    : 'Upload your first images to get started'
                  }
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

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
              className="absolute top-2 right-2 md:top-4 md:right-4 lg:right-24 xl:right-24 bg-black/70 hover:bg-black text-white rounded-full p-1 px-2 text-sm md:text-base"
              aria-label="Close preview"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Import Images</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowImportModal(false);
                  setSelectedFiles([]);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Images
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Images will be automatically converted to WebP and uploaded to Cloudinary
                </p>
              </div>

              {selectedFiles.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Selected {selectedFiles.length} files:
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {selectedFiles.map((file, index) => {
                      const fileName = file.name.replace(/\.[^/.]+$/, '');
                      const sanitizedName = fileName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                      const existingNames = uploadedMedia.map(media => media.name?.toLowerCase());
                      const isDuplicate = existingNames.includes(sanitizedName);
                      
                      return (
                        <div key={index} className={`text-xs truncate flex items-center gap-2 ${
                          isDuplicate ? 'text-black' : 'text-gray-500'
                        }`}>
                          {isDuplicate && <span className="text-black">⚠️</span>}
                          <span className={isDuplicate ? 'font-medium' : ''}>{file.name}</span>
                          {isDuplicate && <span className="text-black text-xs">(already exists)</span>}
                        </div>
                      );
                    })}
                  </div>
                  {selectedFiles.some(file => {
                    const fileName = file.name.replace(/\.[^/.]+$/, '');
                    const sanitizedName = fileName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                    const existingNames = uploadedMedia.map(media => media.name?.toLowerCase());
                    return existingNames.includes(sanitizedName);
                  }) && (
                    <div className="mt-2 p-2 bg-black/5 border border-black/20 rounded text-xs text-black">
                      ⚠️ Some files have names that already exist. Please rename them or remove them from selection.
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleImport}
                  disabled={
                    isImporting || 
                    selectedFiles.length === 0 || 
                    selectedFiles.some(file => {
                      const fileName = file.name.replace(/\.[^/.]+$/, '');
                      const sanitizedName = fileName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                      const existingNames = uploadedMedia.map(media => media.name?.toLowerCase());
                      return existingNames.includes(sanitizedName);
                    })
                  }
                  className="flex-1 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isImporting ? 'Uploading...' : 'Upload to Cloudinary'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowImportModal(false);
                    setSelectedFiles([]);
                  }}
                  className="transition-all duration-200"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                Export {activeTab === 'gallery' ? 'Product Images' : 'Uploaded Images'}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExportModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                <p>
                  Export all {activeTab === 'gallery' ? filteredProducts.length : filteredUploadedMedia.length} 
                  {activeTab === 'gallery' ? ' product images' : ' uploaded images'} as a ZIP file.
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  Images will be named based on {activeTab === 'gallery' ? 'product titles' : 'uploaded file names'} and downloaded as a single ZIP file.
                </p>
                {isExporting && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-sm text-blue-700">Processing images in batches for faster export...</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={activeTab === 'gallery' ? handleExport : handleUploadExport}
                  disabled={
                    isExporting || 
                    (activeTab === 'gallery' ? filteredProducts.length === 0 : filteredUploadedMedia.length === 0)
                  }
                  className="flex-1 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExporting ? 'Exporting...' : `Export All ${activeTab === 'gallery' ? 'Product' : 'Uploaded'} Images`}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setShowExportModal(false)}
                  disabled={isExporting}
                  className="transition-all duration-200"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-black">Confirm Bulk Delete</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                <p>Are you sure you want to delete <strong>{selectedItems.length}</strong> media items?</p>
                <p className="mt-2 text-black font-medium">This action cannot be undone.</p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="flex-1"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete {selectedItems.length} Items
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default Media;
