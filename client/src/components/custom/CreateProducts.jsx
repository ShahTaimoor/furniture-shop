import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import OneLoader from '../ui/OneLoader';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import { AllCategory } from '@/redux/slices/categories/categoriesSlice';
import { useNavigate } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { AddProduct, importProductsFromExcel, fetchProducts } from '@/redux/slices/products/productSlice';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  ImageIcon, 
  X, 
  Search, 
  Eye, 
  Zap, 
  Plus,
  Package,
  DollarSign,
  Hash,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import LazyImage from '../ui/LazyImage';
import Pagination from '../custom/Pagination';
import { convertToWebP, getImageInfo, createPreviewUrl, revokePreviewUrl, isWebPSupported } from '@/utils/imageConverter';
import axiosInstance from '@/redux/slices/auth/axiosInstance';

const CreateProducts = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { categories } = useSelector((state) => state.categories);
  const { products } = useSelector((state) => state.products);
  const [loading, setLoading] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaSearchTerm, setMediaSearchTerm] = useState('');
  const [selectedMediaImage, setSelectedMediaImage] = useState(null);
  const [mediaCurrentPage, setMediaCurrentPage] = useState(1);
  const [mediaTotalPages, setMediaTotalPages] = useState(1);
  const [mediaTotalItems, setMediaTotalItems] = useState(0);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionInfo, setConversionInfo] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadedMedia, setUploadedMedia] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);

  // Initial input values
  const initialValues = {
    title: '',
    price: '',
    category: '',
    stock: '',
    description: '',
    picture: null,
  };

  const [inputValues, setInputValues] = useState(initialValues);
  const [categorySearch, setCategorySearch] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInputValues((values) => ({ ...values, [name]: value }));
  };

  const handleCategoryChange = (value) => {
    setInputValues((values) => ({ ...values, category: value }));
    setCategorySearch(''); // Clear search when category is selected
  };

  const handleCategorySearch = (e) => {
    setCategorySearch(e.target.value);
  };

  // Fetch media from database
  const fetchMedia = useCallback(async () => {
    setMediaLoading(true);
    try {
      const response = await axiosInstance.get('/media');
      
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

  // Handle image file selection and conversion
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check if it's a supported image format
    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
      toast.error('Please select a JPEG, PNG, or WebP image file');
      return;
    }

    setIsConverting(true);
    setConversionInfo(null);

    try {
      // Get original image info
      const originalInfo = await getImageInfo(file);
      
      // Convert to WebP if it's JPEG or PNG
      let processedFile = file;
      if (file.type.match(/^image\/(jpeg|jpg|png)$/)) {
        processedFile = await convertToWebP(file, {
          quality: 0.85,
          maxWidth: 1200,
          maxHeight: 1200,
          maintainAspectRatio: true
        });
        
        // Show conversion info
        const compressionRatio = ((1 - processedFile.size / file.size) * 100).toFixed(1);
        setConversionInfo({
          original: {
            size: (file.size / 1024).toFixed(2),
            type: file.type.split('/')[1].toUpperCase()
          },
          converted: {
            size: (processedFile.size / 1024).toFixed(2),
            type: 'WEBP'
          },
          compression: compressionRatio
        });

        toast.success(`Image optimized! Size reduced by ${compressionRatio}%`);
      } else {
        toast.info('Image is already in WebP format');
      }

      // Create preview URL
      const newPreviewUrl = createPreviewUrl(processedFile);
      if (previewUrl) {
        revokePreviewUrl(previewUrl);
      }
      setPreviewUrl(newPreviewUrl);

      // Update form state
      setInputValues(prev => ({
        ...prev,
        picture: processedFile
      }));

    } catch (error) {
      console.error('Image conversion error:', error);
      toast.error(`Image conversion failed: ${error.message}`);
    } finally {
      setIsConverting(false);
    }
  };

  // Filter categories based on search - show only if search is empty or category starts with search
  const filteredCategories = categories?.filter(category => {
    if (!categorySearch) return true; // Show all when no search
    return category.name.toLowerCase().startsWith(categorySearch.toLowerCase());
  }) || [];

  const handleExcelImport = async (e) => {
    e.preventDefault();
    if (!excelFile) {
      toast.error('Please select an Excel file');
      return;
    }

    setImportLoading(true);
    try {
      const result = await dispatch(importProductsFromExcel(excelFile)).unwrap();
      
      if (result.success) {
        toast.success(result.message);
        setExcelFile(null);
        // Reset file input
        const fileInput = document.getElementById('excelFile');
        if (fileInput) fileInput.value = '';
      } else {
        toast.error(result.message || 'Import failed');
      }
    } catch (error) {
      toast.error(error || 'Import failed');
    } finally {
      setImportLoading(false);
    }
  };

  const downloadTemplate = () => {
    // Create a simple CSV template with only name, stock, price
    const csvContent = "name,stock,price\nSample Product 1,10,29.99\nSample Product 2,5,15.50\nSample Product 3,20,9.99";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('title', inputValues.title);
    formData.append('description', inputValues.description);
    formData.append('price', inputValues.price);
    formData.append('category', inputValues.category);
    formData.append('stock', inputValues.stock);
    if (inputValues.picture) {
      formData.append('picture', inputValues.picture);
    }

    dispatch(AddProduct(formData))
      .unwrap()
      .then((response) => {
        if (response?.success) {
          toast.success(response?.message);
          setInputValues(initialValues);
        } else {
          toast.error(response?.message || 'Failed to add product');
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error('Product creation error:', error);
        toast.error(error || 'Failed to add product');
        setLoading(false);
      });
  };

  useEffect(() => {
    dispatch(AllCategory());
  }, [dispatch]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        revokePreviewUrl(previewUrl);
      }
    };
  }, [previewUrl]);

  // Fetch products and media for media picker with pagination
  useEffect(() => {
    if (showMediaPicker) {
      // Fetch ALL products for media picker (no limit)
      dispatch(fetchProducts({ 
        category: 'all', 
        searchTerm: mediaSearchTerm, 
        page: 1, 
        limit: 1000, // Fetch all products
        stockFilter: 'active'
      }));
      // Also fetch uploaded media
      fetchMedia();
    }
  }, [dispatch, showMediaPicker, mediaSearchTerm, fetchMedia]);

  // Filter products for media picker - only show products with images
  const allProductsWithImages = products?.filter(product => 
    product && 
    product._id && 
    (product.picture?.secure_url || product.image)
  ) || [];

  // Add uploaded media to the filtered results
  const mediaItems = uploadedMedia.map(media => ({
    _id: media._id || media.id,
    title: media.name || media.originalName,
    picture: { secure_url: media.url },
    isUploadedMedia: true,
    uploadedAt: media.createdAt
  }));

  // Combine product images with uploaded media
  const allMedia = [...allProductsWithImages, ...mediaItems];

  // Apply search filter
  const searchFilteredProducts = allMedia.filter(item => {
    if (!mediaSearchTerm) return true;
    const searchLower = mediaSearchTerm.toLowerCase();
    return (
      item.title?.toLowerCase().includes(searchLower) ||
      item.description?.toLowerCase().includes(searchLower) ||
      (item.isUploadedMedia && item.title?.toLowerCase().includes(searchLower))
    );
  });

  // Apply client-side pagination
  const itemsPerPage = 20;
  const startIndex = (mediaCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const filteredMediaProducts = searchFilteredProducts.slice(startIndex, endIndex);

  // Update pagination info when products or media change
  useEffect(() => {
    if (showMediaPicker && (products || uploadedMedia.length > 0)) {
      const totalPages = Math.max(1, Math.ceil(searchFilteredProducts.length / itemsPerPage));
      setMediaTotalPages(totalPages);
      setMediaTotalItems(searchFilteredProducts.length);
    }
  }, [products, uploadedMedia, showMediaPicker, mediaSearchTerm, mediaCurrentPage, searchFilteredProducts.length]);


  const handleMediaPageChange = (page) => {
    setMediaCurrentPage(page);
  };

  const handleMediaSearchChange = (e) => {
    setMediaSearchTerm(e.target.value);
    setMediaCurrentPage(1); // Reset to first page when searching
  };

  const handleMediaSelect = async (product) => {
    setSelectedMediaImage(product);
    setShowMediaPicker(false);
    
    const imageUrl = product.picture?.secure_url || product.image;
    if (imageUrl) {
      setIsConverting(true);
      setConversionInfo(null);
      
      try {
        // Fetch the image
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], `${product.title}.jpg`, { type: blob.type });
        
        // Convert to WebP if it's not already
        let processedFile = file;
        if (file.type.match(/^image\/(jpeg|jpg|png)$/)) {
          processedFile = await convertToWebP(file, {
            quality: 0.85,
            maxWidth: 1200,
            maxHeight: 1200,
            maintainAspectRatio: true
          });
          
          // Show conversion info
          const compressionRatio = ((1 - processedFile.size / file.size) * 100).toFixed(1);
          setConversionInfo({
            original: {
              size: (file.size / 1024).toFixed(2),
              type: file.type.split('/')[1].toUpperCase()
            },
            converted: {
              size: (processedFile.size / 1024).toFixed(2),
              type: 'WEBP'
            },
            compression: compressionRatio
          });

          toast.success(`Image optimized! Size reduced by ${compressionRatio}%`);
        }

        // Create preview URL
        const newPreviewUrl = createPreviewUrl(processedFile);
        if (previewUrl) {
          revokePreviewUrl(previewUrl);
        }
        setPreviewUrl(newPreviewUrl);

        // Update form state
        setInputValues(prev => ({ ...prev, picture: processedFile }));
        
      } catch (error) {
        console.error('Error processing selected image:', error);
        toast.error('Failed to process selected image');
      } finally {
        setIsConverting(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="w-full">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
          </div>
          <p className="text-gray-600 text-lg">Create and manage your product catalog efficiently</p>
        </div>

        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
              <Plus className="h-6 w-6 text-blue-600" />
              Create New Products
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-8">
            <Tabs defaultValue="single" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-lg">
                <TabsTrigger 
                  value="single" 
                  className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <Package className="h-4 w-4" />
                  Single Product
                </TabsTrigger>
                <TabsTrigger 
                  value="excel" 
                  className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Bulk Import
                </TabsTrigger>
              </TabsList>
          
              <TabsContent value="single" className="mt-8">
                <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-8">
                  {/* Basic Information Section */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      Basic Information
                    </h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Title */}
                      <div className="space-y-2">
                        <Label htmlFor="title" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Product Title *
                        </Label>
                        <Input
                          value={inputValues.title}
                          onChange={handleChange}
                          id="title"
                          name="title"
                          placeholder="Enter product title"
                          className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          required
                        />
                      </div>

                      {/* Price */}
                      <div className="space-y-2">
                        <Label htmlFor="price" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Price *
                        </Label>
                        <Input
                          value={inputValues.price}
                          onChange={handleChange}
                          id="price"
                          name="price"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          required
                        />
                      </div>

                      {/* Category */}
                      <div className="space-y-2">
                        <Label htmlFor="category" className="text-sm font-medium text-gray-700">
                          Category *
                        </Label>
                        <Select
                          onValueChange={handleCategoryChange}
                          value={inputValues.category}
                        >
                          <SelectTrigger className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent position="popper" className="max-h-60">
                            {/* Search Input */}
                            <div className="p-3 border-b bg-gray-50">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <Input
                                  placeholder="Search categories..."
                                  value={categorySearch}
                                  onChange={handleCategorySearch}
                                  className="pl-10 h-9"
                                />
                              </div>
                            </div>
                            
                            {/* Category List */}
                            <div className="max-h-48 overflow-y-auto">
                              {filteredCategories.length > 0 ? (
                                filteredCategories.map((category) => (
                                  <SelectItem key={category._id} value={category._id} className="py-3">
                                    {category.name
                                      .split(' ')
                                      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                      .join(' ')
                                    }
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="p-4 text-sm text-gray-500 text-center">
                                  No categories found
                                </div>
                              )}
                            </div>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Stock */}
                      <div className="space-y-2">
                        <Label htmlFor="stock" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <Hash className="h-4 w-4" />
                          Stock Quantity *
                        </Label>
                        <Input
                          value={inputValues.stock}
                          onChange={handleChange}
                          id="stock"
                          name="stock"
                          type="number"
                          placeholder="0"
                          className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div className="mt-6 space-y-2">
                      <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                        Product Description
                      </Label>
                      <textarea
                        value={inputValues.description}
                        onChange={handleChange}
                        id="description"
                        name="description"
                        placeholder="Describe your product..."
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500 resize-none"
                      />
                    </div>
                  </div>

                  {/* Image Upload Section */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-blue-600" />
                      Product Image
                    </h3>
                    
                    {/* Media Picker Button */}
                    <div className="mb-6">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowMediaPicker(true);
                          setMediaCurrentPage(1);
                          setMediaSearchTerm('');
                        }}
                        className="w-full h-12 flex items-center gap-3 border-2 border-dashed border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200"
                      >
                        <ImageIcon className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">Choose from Existing Images</span>
                      </Button>
                    </div>

                    {/* Upload Area */}
                    <div className="relative">
                      <div className="flex justify-center px-6 pt-8 pb-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-200 group">
                        <div className="space-y-4 text-center">
                          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors duration-200">
                            <Upload className="h-8 w-8 text-gray-400 group-hover:text-blue-500" />
                          </div>
                          <div className="space-y-2">
                            <div className="flex text-sm text-gray-600 justify-center items-center">
                              <label
                                htmlFor="picture"
                                className="relative cursor-pointer font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200"
                              >
                                <span className="underline">Upload a file</span>
                                <input
                                  id="picture"
                                  name="picture"
                                  type="file"
                                  accept="image/jpeg,image/jpg,image/png,image/webp"
                                  className="sr-only"
                                  onChange={handleImageChange}
                                  disabled={isConverting}
                                />
                              </label>
                              <span className="mx-2">or</span>
                              <span className="text-gray-500">drag and drop</span>
                            </div>
                            <p className="text-xs text-gray-500">
                              PNG, JPG, WEBP up to 5MB • Auto-converted to WebP
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Conversion Status */}
                    {isConverting && (
                      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                          <span className="text-sm font-medium text-blue-800">Optimizing image...</span>
                        </div>
                      </div>
                    )}

                    {/* Conversion Info */}
                    {conversionInfo && (
                      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-3 mb-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-semibold text-green-800">Image Optimized!</span>
                        </div>
                        <div className="bg-white rounded-lg p-3 space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Original:</span>
                            <span className="font-medium">{conversionInfo.original.size}KB ({conversionInfo.original.type})</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Optimized:</span>
                            <span className="font-medium text-green-600">{conversionInfo.converted.size}KB ({conversionInfo.converted.type})</span>
                          </div>
                          <div className="text-center text-sm font-semibold text-green-700 bg-green-100 rounded px-3 py-1">
                            {conversionInfo.compression}% size reduction
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Preview */}
                    {inputValues.picture && (
                      <div className="mt-6">
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start gap-4">
                            <div className="relative">
                              <img
                                src={previewUrl || URL.createObjectURL(inputValues.picture)}
                                alt="Preview"
                                className="w-24 h-24 object-cover rounded-lg border"
                              />
                              {inputValues.picture.type === 'image/webp' && (
                                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                                  WebP
                                </div>
                              )}
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-sm font-medium text-gray-800">Image ready</span>
                                {inputValues.picture.type === 'image/webp' && (
                                  <span className="text-xs text-green-600 font-medium bg-green-100 px-2 py-1 rounded">Optimized</span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setInputValues((v) => ({ ...v, picture: null }));
                                  setConversionInfo(null);
                                  if (previewUrl) {
                                    revokePreviewUrl(previewUrl);
                                    setPreviewUrl(null);
                                  }
                                }}
                                className="text-sm font-medium text-red-600 hover:text-red-500 transition-colors duration-200"
                              >
                                Remove Image
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end pt-6">
                    <Button
                      type="submit"
                      className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Adding Product...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Add Product
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </TabsContent>
          
              <TabsContent value="excel" className="mt-8">
                <div className="space-y-8">
                  {/* Instructions */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Import Instructions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <h4 className="font-medium text-blue-800">Required Columns</h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                            <strong>name</strong> - Product title
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                            <strong>stock</strong> - Quantity available
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                            <strong>price</strong> - Product price
                          </li>
                        </ul>
                      </div>
                      <div className="space-y-3">
                        <h4 className="font-medium text-blue-800">Important Notes</h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            All columns are optional
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            Auto-assigned to "General" category
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            Empty rows are skipped
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Template Download */}
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <FileSpreadsheet className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800">Excel Template</h3>
                          <p className="text-sm text-gray-600">Download our pre-formatted template</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={downloadTemplate}
                        className="flex items-center gap-2 h-11 px-4 border-green-200 text-green-700 hover:bg-green-50"
                      >
                        <Download className="h-4 w-4" />
                        Download Template
                      </Button>
                    </div>
                  </div>

                  {/* File Upload */}
                  <form onSubmit={handleExcelImport} className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                      <Upload className="h-5 w-5 text-blue-600" />
                      Upload Excel File
                    </h3>
                    
                    <div className="space-y-6">
                      {/* Upload Area */}
                      <div className="flex justify-center px-6 pt-8 pb-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-200 group">
                        <div className="space-y-4 text-center">
                          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors duration-200">
                            <FileSpreadsheet className="h-8 w-8 text-gray-400 group-hover:text-blue-500" />
                          </div>
                          <div className="space-y-2">
                            <div className="flex text-sm text-gray-600 justify-center items-center">
                              <label
                                htmlFor="excelFile"
                                className="relative cursor-pointer font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200"
                              >
                                <span className="underline">Upload Excel file</span>
                                <input
                                  id="excelFile"
                                  name="excelFile"
                                  type="file"
                                  accept=".xlsx,.xls,.csv"
                                  className="sr-only"
                                  onChange={(e) => setExcelFile(e.target.files[0])}
                                />
                              </label>
                              <span className="mx-2">or</span>
                              <span className="text-gray-500">drag and drop</span>
                            </div>
                            <p className="text-xs text-gray-500">
                              Excel files (.xlsx, .xls, .csv) up to 10MB
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* File Preview */}
                      {excelFile && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <FileSpreadsheet className="h-5 w-5 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-green-800">
                                  {excelFile.name}
                                </span>
                                <span className="text-xs text-green-600 bg-green-200 px-2 py-1 rounded">
                                  {(excelFile.size / 1024 / 1024).toFixed(2)} MB
                                </span>
                              </div>
                              <p className="text-xs text-green-700 mt-1">Ready to import</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setExcelFile(null);
                                const fileInput = document.getElementById('excelFile');
                                if (fileInput) fileInput.value = '';
                              }}
                              className="text-red-600 hover:text-red-500 transition-colors duration-200"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Import Button */}
                      <Button
                        type="submit"
                        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                        disabled={importLoading || !excelFile}
                      >
                        {importLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Importing Products...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            Import Products
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

      {/* Media Picker Modal */}
      {showMediaPicker && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ImageIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">Choose from Existing Images</h2>
                  <p className="text-sm text-gray-600">Select an image from your media library</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMediaPicker(false)}
                className="h-10 w-10 rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Search */}
            <div className="p-6 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Search images by product name or description..."
                  value={mediaSearchTerm}
                  onChange={handleMediaSearchChange}
                  className="pl-12 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                />
              </div>
            </div>

            

            {/* Media Grid */}
            <div className="p-6 flex-1 overflow-y-auto">
              {mediaLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                    <span className="text-gray-600 font-medium">Loading media...</span>
                  </div>
                </div>
              ) : filteredMediaProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {filteredMediaProducts.map((product) => (
                    <div
                      key={product._id}
                      className="relative group cursor-pointer rounded-xl overflow-hidden border-2 border-transparent hover:border-blue-500 hover:shadow-lg transition-all duration-200 bg-white"
                      onClick={() => handleMediaSelect(product)}
                    >
                      <div className="aspect-square bg-gray-50 relative">
                        <LazyImage
                          src={product.picture?.secure_url || product.image}
                          alt={product.title}
                          className="w-full h-full object-cover"
                          fallback="/logo.jpeg"
                          quality={85}
                        />
                        
                        {/* Uploaded Media Indicator */}
                        {product.isUploadedMedia && (
                          <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 font-medium">
                            <Upload className="h-3 w-3" />
                            Uploaded
                          </div>
                        )}
                        
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                          <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                            <Eye className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      </div>
                      
                      {/* Product title */}
                      <div className="p-3 bg-white">
                        <p className="text-xs text-gray-700 truncate font-medium" title={product.title}>
                          {product.title}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ImageIcon className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No images found</h3>
                  <p className="text-gray-500 max-w-sm mx-auto">
                    {mediaSearchTerm 
                      ? 'Try adjusting your search criteria or browse all available images'
                      : 'No product images available in your media library'
                    }
                  </p>
                </div>
              )}
            </div>

            {/* Pagination - Bottom */}
            {mediaTotalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-center">
                  <Pagination
                    currentPage={mediaCurrentPage}
                    totalPages={mediaTotalPages}
                    onPageChange={handleMediaPageChange}
                  />
                </div>
              </div>
            )}

           
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default CreateProducts;