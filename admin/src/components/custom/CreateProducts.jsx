import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Card } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import OneLoader from '../ui/OneLoader';
import { Checkbox } from '../ui/checkbox';
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
  CheckCircle,
  AlertCircle,
  Trash
} from 'lucide-react';
import LazyImage from '../ui/LazyImage';
import Pagination from '../custom/Pagination';
import { convertToWebP, getImageInfo, createPreviewUrl, revokePreviewUrl, isWebPSupported } from '@/utils/imageConverter';
import axiosInstance from '@/redux/slices/auth/axiosInstance';

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

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
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [galleryPreviews, setGalleryPreviews] = useState([]);
  const galleryPreviewsRef = useRef([]);
  const [uploadedMedia, setUploadedMedia] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);

  // Initial input values
  const initialValues = {
    title: '',
    costPrice: '',
    salePrice: '',
    discount: '',
    category: '',
    stock: '',
    description: '',
    picture: null,
    isFeatured: false,
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
      const response = await axiosInstance.get('/pg/media');
      
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

  const appendGalleryFiles = useCallback((files = []) => {
    if (!files.length) return;

    const nextFiles = [];
    const nextPreviews = [];

    files.forEach((file) => {
      if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
        toast.error(`Unsupported file type for ${file.name}. Please use JPEG, PNG, or WebP.`);
        return;
      }

      const preview = createPreviewUrl(file);
      nextFiles.push(file);
      nextPreviews.push({
        url: preview,
        name: file.name,
        size: file.size,
        type: file.type,
      });
    });

    if (!nextFiles.length) return;

    setGalleryFiles((prev) => [...prev, ...nextFiles]);
    setGalleryPreviews((prev) => [...prev, ...nextPreviews]);
  }, []);

  // Handle image file selection and conversion
  const handleImageChange = async (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    let filesForGallery = selectedFiles;

    if (!inputValues.picture) {
      const [primaryFile, ...rest] = selectedFiles;
      filesForGallery = rest;

      if (!primaryFile.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
        toast.error('Please select a JPEG, PNG, or WebP image file');
        return;
      }

      setIsConverting(true);
      setConversionInfo(null);

      try {
        // Get original image info
        await getImageInfo(primaryFile);
        
        // Convert to WebP if it's JPEG or PNG
        let processedFile = primaryFile;
        if (primaryFile.type.match(/^image\/(jpeg|jpg|png)$/)) {
          processedFile = await convertToWebP(primaryFile, {
            quality: 0.85,
            maxWidth: 1200,
            maxHeight: 1200,
            maintainAspectRatio: true
          });
          
          // Show conversion info
          const compressionRatio = ((1 - processedFile.size / primaryFile.size) * 100).toFixed(1);
          setConversionInfo({
            original: {
              size: (primaryFile.size / 1024).toFixed(2),
              type: primaryFile.type.split('/')[1].toUpperCase()
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
    }

    if (filesForGallery.length > 0) {
      appendGalleryFiles(filesForGallery);
    }

    e.target.value = '';
  };

  const handleRemoveGalleryImage = (index) => {
    setGalleryFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
    setGalleryPreviews((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed?.url) {
        revokePreviewUrl(removed.url);
      }
      return next;
    });
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
    // Create a simple CSV template with cost price, sale price, and optional discount
    const csvContent = "name,stock,costPrice,salePrice,discount\nSample Product 1,10,19.99,29.99,0\nSample Product 2,5,10.50,15.50,5\nSample Product 3,20,7.50,9.99,0";
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
    formData.append('costPrice', inputValues.costPrice || '0');
    formData.append('salePrice', inputValues.salePrice || '0');
    if (inputValues.discount !== '') {
      formData.append('discount', inputValues.discount);
    }
    formData.append('price', inputValues.salePrice || inputValues.costPrice || '0');
    formData.append('category', inputValues.category);
    formData.append('stock', inputValues.stock);
    formData.append('isFeatured', inputValues.isFeatured);

    let primaryHandledFromGallery = false;
    if (inputValues.picture) {
      formData.append('picture', inputValues.picture);
    } else if (galleryFiles.length > 0) {
      formData.append('picture', galleryFiles[0]);
      primaryHandledFromGallery = true;
    }

    galleryFiles.forEach((file, index) => {
      if (primaryHandledFromGallery && index === 0) {
        return;
      }
      formData.append('images', file);
    });

    dispatch(AddProduct(formData))
      .unwrap()
      .then((response) => {
        if (response?.success) {
          toast.success(response?.message);
          setInputValues(initialValues);
          setConversionInfo(null);
          if (previewUrl) {
            revokePreviewUrl(previewUrl);
            setPreviewUrl(null);
          }
          galleryPreviewsRef.current.forEach((preview) => {
            if (preview?.url) {
              revokePreviewUrl(preview.url);
            }
          });
          galleryPreviewsRef.current = [];
          setGalleryFiles([]);
          setGalleryPreviews([]);
          const pictureInput = document.getElementById('picture');
          if (pictureInput) {
            pictureInput.value = '';
          }
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

  useEffect(() => {
    galleryPreviewsRef.current = galleryPreviews;
  }, [galleryPreviews]);

  useEffect(() => {
    return () => {
      galleryPreviewsRef.current.forEach((preview) => {
        if (preview?.url) {
          revokePreviewUrl(preview.url);
        }
      });
    };
  }, []);

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
    <div>
      <Card className="gap-0 py-0">
        <Tabs defaultValue="single">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-1.5">
                <Package className="h-4 w-4 text-primary" />
              </div>
              <h1 className="text-base font-bold leading-tight">Product</h1>
            </div>
            <TabsList className="h-9">
              <TabsTrigger value="single" className="gap-1.5 text-sm">
                <Package className="h-3.5 w-3.5" />
                Single Product
              </TabsTrigger>
              <TabsTrigger value="excel" className="gap-1.5 text-sm">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Bulk Import
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="single" className="mt-0 p-4">
            <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-3">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                {/* Left: form fields */}
                <div className="space-y-3 lg:col-span-3">
                  <div className="space-y-1">
                    <Label htmlFor="title" className="text-xs font-medium">Product Title *</Label>
                    <Input
                      value={inputValues.title}
                      onChange={handleChange}
                      id="title"
                      name="title"
                      placeholder="Enter product title"
                      className="h-9"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="costPrice" className="text-xs font-medium">Cost Price *</Label>
                      <Input
                        value={inputValues.costPrice}
                        onChange={handleChange}
                        id="costPrice"
                        name="costPrice"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="h-9"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="salePrice" className="text-xs font-medium">Sale Price *</Label>
                      <Input
                        value={inputValues.salePrice}
                        onChange={handleChange}
                        id="salePrice"
                        name="salePrice"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="h-9"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="discount" className="text-xs font-medium">Discount %</Label>
                      <Input
                        value={inputValues.discount}
                        onChange={handleChange}
                        id="discount"
                        name="discount"
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        placeholder="0"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="stock" className="text-xs font-medium">Stock Quantity *</Label>
                      <Input
                        value={inputValues.stock}
                        onChange={handleChange}
                        id="stock"
                        name="stock"
                        type="number"
                        placeholder="0"
                        className="h-9"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="category" className="text-xs font-medium">Category *</Label>
                      <Select onValueChange={handleCategoryChange} value={inputValues.category}>
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="max-h-60">
                          <div className="border-b bg-muted/50 p-2">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                placeholder="Search categories..."
                                value={categorySearch}
                                onChange={handleCategorySearch}
                                className="h-8 pl-8"
                              />
                            </div>
                          </div>
                          <div className="max-h-40 overflow-y-auto">
                            {filteredCategories.length > 0 ? (
                              filteredCategories.map((category) => (
                                <SelectItem key={category._id} value={category._id}>
                                  {category.name
                                    .split(' ')
                                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                    .join(' ')}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-3 text-center text-sm text-muted-foreground">No categories found</div>
                            )}
                          </div>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium opacity-0 select-none">Feature</Label>
                      <div className="flex h-9 items-center gap-2 rounded-md border px-3">
                        <Checkbox
                          id="isFeatured"
                          checked={inputValues.isFeatured}
                          onCheckedChange={(checked) =>
                            setInputValues((values) => ({ ...values, isFeatured: checked === true }))
                          }
                        />
                        <Label htmlFor="isFeatured" className="flex items-center gap-1.5 text-xs font-semibold">
                          <Zap className="h-3.5 w-3.5 text-primary" />
                          Feature this product
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="description" className="text-xs font-medium">Product Description</Label>
                    <textarea
                      value={inputValues.description}
                      onChange={handleChange}
                      id="description"
                      name="description"
                      placeholder="Describe your product..."
                      rows={3}
                      className="w-full resize-none rounded-md border border-input px-3 py-2 text-sm focus:border-ring focus:outline-none"
                    />
                  </div>
                </div>

                {/* Right: image upload */}
                <div className="flex flex-col gap-3 lg:col-span-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowMediaPicker(true);
                      setMediaCurrentPage(1);
                      setMediaSearchTerm('');
                    }}
                    className="h-9 gap-2 border-dashed"
                  >
                    <ImageIcon className="h-4 w-4" />
                    Choose from Existing Images
                  </Button>

                  <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-5 text-center hover:border-primary/50 hover:bg-muted/30">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <div className="flex items-center gap-1 text-sm">
                      <label htmlFor="picture" className="cursor-pointer font-medium text-primary underline">
                        Upload files
                        <input
                          id="picture"
                          name="picture"
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          multiple
                          className="sr-only"
                          onChange={handleImageChange}
                          disabled={isConverting}
                        />
                      </label>
                      <span className="text-muted-foreground">or drag & drop</span>
                    </div>
                    <p className="text-xs text-muted-foreground">PNG, JPG, WEBP up to 5MB</p>
                  </div>

                  {isConverting && (
                    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2 text-xs">
                      <OneLoader size="tiny" inline />
                      Optimizing image...
                    </div>
                  )}

                  {conversionInfo && (
                    <div className="rounded-lg border bg-muted/30 p-2 text-xs">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                        Optimized: {conversionInfo.original.size}KB → {conversionInfo.converted.size}KB ({conversionInfo.compression}% smaller)
                      </div>
                    </div>
                  )}

                  {inputValues.picture && (
                    <div className="flex items-center gap-3 rounded-lg border p-2">
                      <img
                        src={previewUrl || URL.createObjectURL(inputValues.picture)}
                        alt="Preview"
                        className="h-14 w-14 rounded-md border object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1 text-xs font-medium">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> Image ready
                        </p>
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
                          className="text-xs font-medium text-destructive hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}

                  {galleryPreviews.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {galleryPreviews.map((preview, index) => (
                        <div key={`${preview.url}-${index}`} className="relative rounded-md border p-1">
                          <img
                            src={preview.url}
                            alt={preview.name || `Gallery image ${index + 1}`}
                            className="h-14 w-full rounded object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveGalleryImage(index)}
                            className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                            aria-label="Remove gallery image"
                          >
                            <Trash className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end border-t pt-3">
                <Button type="submit" className="gap-2" disabled={loading}>
                  {loading ? (
                    <>
                      <OneLoader size="tiny" inline /> Adding Product...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" /> Add Product
                    </>
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="excel" className="mt-0 flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <AlertCircle className="h-4 w-4" /> Import Instructions
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-medium text-muted-foreground">Required Columns</h4>
                    <ul className="space-y-1 text-xs">
                      <li><strong>name</strong> - Product title</li>
                      <li><strong>stock</strong> - Quantity available</li>
                      <li><strong>costPrice</strong> - Acquisition cost</li>
                      <li><strong>salePrice</strong> - Selling price</li>
                      <li><strong>discount</strong> - Optional</li>
                    </ul>
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-medium text-muted-foreground">Notes</h4>
                    <ul className="space-y-1 text-xs">
                      <li>Discount defaults to 0</li>
                      <li>Auto-assigned to "General" category</li>
                      <li>Empty rows are skipped</li>
                    </ul>
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
                  <Download className="h-3.5 w-3.5" /> Download Template
                </Button>
              </div>

              <form onSubmit={handleExcelImport} className="space-y-3 rounded-lg border p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Upload className="h-4 w-4" /> Upload Excel File
                </h3>

                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center hover:border-primary/50 hover:bg-muted/30">
                  <FileSpreadsheet className="h-6 w-6 text-muted-foreground" />
                  <div className="flex items-center gap-1 text-sm">
                    <label htmlFor="excelFile" className="cursor-pointer font-medium text-primary underline">
                      Upload Excel file
                      <input
                        id="excelFile"
                        name="excelFile"
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="sr-only"
                        onChange={(e) => setExcelFile(e.target.files[0])}
                      />
                    </label>
                    <span className="text-muted-foreground">or drag & drop</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Excel files (.xlsx, .xls, .csv) up to 10MB</p>
                </div>

                {excelFile && (
                  <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-2">
                    <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs font-medium">
                        <span className="truncate">{excelFile.name}</span>
                        <span className="shrink-0 text-muted-foreground">{(excelFile.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setExcelFile(null);
                        const fileInput = document.getElementById('excelFile');
                        if (fileInput) fileInput.value = '';
                      }}
                      className="text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <Button type="submit" className="w-full gap-2" disabled={importLoading || !excelFile}>
                  {importLoading ? (
                    <>
                      <OneLoader size="tiny" inline /> Importing Products...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" /> Import Products
                    </>
                  )}
                </Button>
              </form>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Media Picker Modal */}
      {showMediaPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <ImageIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Choose from Existing Images</h2>
                  <p className="text-xs text-muted-foreground">Select an image from your media library</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowMediaPicker(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="border-b p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search images by product name or description..."
                  value={mediaSearchTerm}
                  onChange={handleMediaSearchChange}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {mediaLoading ? (
                <div className="flex items-center justify-center py-16">
                  <OneLoader size="small" text="Loading media..." />
                </div>
              ) : filteredMediaProducts.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {filteredMediaProducts.map((product) => (
                    <div
                      key={product._id}
                      className="group relative cursor-pointer overflow-hidden rounded-lg border bg-background hover:border-primary hover:shadow-md"
                      onClick={() => handleMediaSelect(product)}
                    >
                      <div className="relative aspect-square bg-muted">
                        <LazyImage
                          src={product.picture?.secure_url || product.image}
                          alt={product.title}
                          className="h-full w-full object-cover"
                          fallback="/logo.svg"
                          quality={85}
                        />
                        {product.isUploadedMedia && (
                          <div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                            <Upload className="h-2.5 w-2.5" /> Uploaded
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                          <Eye className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <p className="truncate p-2 text-xs font-medium" title={product.title}>
                        {product.title}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <ImageIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">No images found</h3>
                  <p className="mx-auto max-w-sm text-xs text-muted-foreground">
                    {mediaSearchTerm
                      ? 'Try adjusting your search criteria or browse all available images'
                      : 'No product images available in your media library'}
                  </p>
                </div>
              )}
            </div>

            {mediaTotalPages > 1 && (
              <div className="flex justify-center border-t p-3">
                <Pagination
                  currentPage={mediaCurrentPage}
                  totalPages={mediaTotalPages}
                  onPageChange={handleMediaPageChange}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateProducts;