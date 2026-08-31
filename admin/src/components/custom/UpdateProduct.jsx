import { AllCategory } from '@/redux/slices/categories/categoriesSlice';
import { getSingleProduct, updateSingleProduct } from '@/redux/slices/products/productSlice';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';
import { toast } from 'sonner';
import { ImageIcon, Trash2 } from 'lucide-react';
import OneLoader from '../ui/OneLoader';
import { convertToWebP } from '@/utils/imageConverter';

const UpdateProduct = () => {
  const [inputValue, setInputValue] = useState({
    title: '',
    costPrice: '',
    salePrice: '',
    discount: '',
    category: '',
    picture: '',
    description: '',
    stock: '',
  });

  const [previewImage, setPreviewImage] = useState('');
  const [existingImages, setExistingImages] = useState([]);
  const [removedImageIds, setRemovedImageIds] = useState([]);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [galleryPreviews, setGalleryPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [isConverting, setIsConverting] = useState(false);

  const { categories } = useSelector((state) => state.categories);
  const { singleProducts } = useSelector((s) => s.products);
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  
  // Get page number from URL params to return to the same page after update
  const searchParams = new URLSearchParams(location.search);
  const returnPage = searchParams.get('page') || '1';

  const handleChange = async (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      const file = files[0];
      if (!file) return;

      // Raw camera photos were being sent to the server uncompressed — combined with
      // gallery images in the same request, that could exceed the hosting platform's
      // request size limit and fail the whole upload with a generic network error.
      let processedFile = file;
      if (file.type.match(/^image\/(jpeg|jpg|png)$/)) {
        setIsConverting(true);
        try {
          processedFile = await convertToWebP(file, {
            quality: 0.85,
            maxWidth: 1200,
            maxHeight: 1200,
            maintainAspectRatio: true,
          });
        } catch (error) {
          console.error('Primary image conversion error:', error);
        } finally {
          setIsConverting(false);
        }
      }

      setInputValue((values) => ({ ...values, [name]: processedFile }));
      setPreviewImage(URL.createObjectURL(processedFile));
    } else {
      setInputValue((values) => ({ ...values, [name]: value }));
    }
  };

  const handleCategoryChange = (value) => {
    setInputValue((values) => ({ ...values, category: value }));
    setCategorySearch(''); // Clear search when category is selected
  };

  const handleCategorySearch = (e) => {
    setCategorySearch(e.target.value);
  };

  // Filter categories based on search - show only if search is empty or category starts with search
  const filteredCategories = categories?.filter(category => {
    if (!categorySearch) return true; // Show all when no search
    return category.name.toLowerCase().startsWith(categorySearch.toLowerCase());
  }) || [];

  const handleRemoveImage = () => {
    setInputValue((prev) => ({ ...prev, picture: '' }));
    setPreviewImage('');
  };

  const handleCancel = () => {
    navigate(`/admin/dashboard/all-products?page=${returnPage}`);
  };

  useEffect(() => {
    dispatch(getSingleProduct(id));
    dispatch(AllCategory());
  }, [id, dispatch]);

  useEffect(() => {
    if (singleProducts) {
      const {
        title,
        costPrice,
        salePrice,
        discount,
        category,
        picture,
        description,
        stock
      } = singleProducts;
      setInputValue({
        title: title || '',
        costPrice: costPrice !== undefined && costPrice !== null ? costPrice : '',
        salePrice: salePrice !== undefined && salePrice !== null ? salePrice : '',
        discount: discount !== undefined && discount !== null ? discount : '',
        category: category?._id || '',
        picture: '',
        description: description || '',
        stock: stock !== undefined && stock !== null ? stock : '',
      });
      setPreviewImage(picture?.secure_url || '');
    }
  }, [singleProducts]);

  useEffect(() => {
    if (singleProducts?.images && Array.isArray(singleProducts.images)) {
      setExistingImages(singleProducts.images);
    } else {
      setExistingImages([]);
    }
    setRemovedImageIds([]);
  }, [singleProducts]);

  useEffect(() => {
    return () => {
      galleryPreviews.forEach((preview) => {
        if (preview?.url) {
          URL.revokeObjectURL(preview.url);
        }
      });
    };
  }, [galleryPreviews]);

  const handleGalleryChange = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;

    setIsConverting(true);
    const nextFiles = [];
    const nextPreviews = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error(`Unsupported file type: ${file.name}`);
        continue;
      }

      let processedFile = file;
      if (file.type.match(/^image\/(jpeg|jpg|png)$/)) {
        try {
          processedFile = await convertToWebP(file, {
            quality: 0.85,
            maxWidth: 1200,
            maxHeight: 1200,
            maintainAspectRatio: true,
          });
        } catch (error) {
          console.error('Gallery image conversion error:', error);
        }
      }

      nextFiles.push(processedFile);
      nextPreviews.push({
        url: URL.createObjectURL(processedFile),
        name: file.name,
        size: processedFile.size,
      });
    }

    setIsConverting(false);

    if (nextFiles.length) {
      setGalleryFiles((prev) => [...prev, ...nextFiles]);
      setGalleryPreviews((prev) => [...prev, ...nextPreviews]);
    }
  };

  const handleRemoveGalleryImage = (index) => {
    setGalleryFiles((prev) => prev.filter((_, i) => i !== index));
    setGalleryPreviews((prev) => {
      const updated = [...prev];
      const [removed] = updated.splice(index, 1);
      if (removed?.url) {
        URL.revokeObjectURL(removed.url);
      }
      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append('title', inputValue.title || '');
    if (inputValue.description) {
      formData.append('description', inputValue.description);
    }
    if (inputValue.costPrice !== '') {
      formData.append('costPrice', inputValue.costPrice);
    }
    if (inputValue.salePrice !== '') {
      formData.append('salePrice', inputValue.salePrice);
    }
    if (inputValue.discount !== '') {
      formData.append('discount', inputValue.discount);
    }
    formData.append('price', inputValue.salePrice || inputValue.costPrice || '0');
    if (inputValue.category) {
      formData.append('category', inputValue.category);
    }
    if (inputValue.stock !== '') {
      formData.append('stock', inputValue.stock);
    }
    if (inputValue.picture instanceof File) {
      formData.append('picture', inputValue.picture);
    }
    galleryFiles.forEach((file) => {
      formData.append('images', file);
    });
    if (removedImageIds.length > 0) {
      formData.append('imagesToRemove', JSON.stringify(removedImageIds));
    }

    dispatch(updateSingleProduct({ inputValues: formData, id }))
      .unwrap()
      .then((response) => {
        if (response?.success) {
          toast.success(response?.message);
          setInputValue({
            title: '',
            costPrice: '',
            salePrice: '',
            discount: '',
            category: '',
            picture: '',
            description: '',
            stock: '',
          });
          setPreviewImage('');
          navigate(`/admin/dashboard/all-products?page=${returnPage}`);
        } else {
          toast.error(response?.message || 'Failed to update product');
        }
      })
      .catch((error) => {
        toast.error(error || 'Failed to update product');
      })
      .finally(() => setLoading(false));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update Product</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} encType="multipart/form-data">
          <div className="grid gap-6">
            <div className="grid gap-3">
              <Label htmlFor="title">Title</Label>
              <Input
                type="text"
                id="title"
                name="title"
                value={inputValue.title}
                onChange={handleChange}
                placeholder="Enter Product Title"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-3">
                <Label htmlFor="costPrice">Cost Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  id="costPrice"
                  name="costPrice"
                  value={inputValue.costPrice}
                  onChange={handleChange}
                  placeholder="Enter Cost Price"
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="salePrice">Sale Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  id="salePrice"
                  name="salePrice"
                  value={inputValue.salePrice}
                  onChange={handleChange}
                  placeholder="Enter Sale Price"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-3">
                <Label htmlFor="discount">Discount (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  id="discount"
                  name="discount"
                  value={inputValue.discount}
                  onChange={handleChange}
                  placeholder="Enter discount percentage"
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="category">Category</Label>
                <Select value={inputValue.category} onValueChange={handleCategoryChange}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-60">
                    {/* Search Input */}
                    <div className="p-2 border-b">
                      <Input
                        placeholder="Type first letter to filter..."
                        value={categorySearch}
                        onChange={handleCategorySearch}
                        className="h-8"
                      />
                    </div>
                    
                    {/* Category List */}
                    <div className="max-h-48 overflow-y-auto">
                      {filteredCategories.length > 0 ? (
                        filteredCategories.map((category) => (
                          <SelectItem key={category._id} value={category._id}>
                            {category.name
                              .split(' ')
                              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                              .join(' ')
                            }
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-gray-500 text-center">
                          No categories found
                        </div>
                      )}
                    </div>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="stock">Stock Quantity</Label>
              <Input
                type="number"
                id="stock"
                name="stock"
                value={inputValue.stock}
                onChange={handleChange}
                placeholder="Enter stock amount"
              />
            </div>

            <div className="grid gap-6">
              <div className="grid gap-3">
                <Label htmlFor="picture" className="text-sm font-medium text-gray-700">
                  Primary Image
                </Label>
                <label
                  htmlFor="picture"
                  className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:border-blue-500 hover:bg-blue-50 transition duration-200 ease-in-out"
                >
                  <span className="text-gray-500 text-sm">Click to upload</span>
                  <span className="text-xs text-gray-400">(JPEG, PNG, WebP)</span>
                  <Input
                    type="file"
                    id="picture"
                    name="picture"
                    accept="image/*"
                    onChange={handleChange}
                    className="hidden"
                  />
                </label>
                {previewImage && (
                  <div className="relative mt-2 w-32 h-32">
                    <img
                      src={previewImage}
                      alt="Primary preview"
                      className="w-full h-full object-cover rounded"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md hover:bg-red-700"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {existingImages.length > 0 && (
                <div className="grid gap-3">
                  <Label className="text-sm font-medium text-gray-700">Existing Gallery Images</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {existingImages.map((image) => (
                      <div
                        key={image._id || image.public_id || image.secure_url}
                        className="relative rounded-lg border border-gray-200 overflow-hidden bg-white group"
                      >
                        <img
                          src={image.secure_url}
                          alt={image.alt || 'Gallery image'}
                          className="h-32 w-full object-cover"
                        />
                        {image.isPrimary && (
                          <span className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-white">
                            Primary
                          </span>
                        )}
                        {image.public_id && (
                          <button
                            type="button"
                            onClick={() => {
                              setExistingImages((prev) =>
                                prev.filter((img) => img.public_id !== image.public_id)
                              );
                              setRemovedImageIds((prev) =>
                                prev.includes(image.public_id) ? prev : [...prev, image.public_id]
                              );
                            }}
                            className="absolute top-2 right-2 inline-flex items-center justify-center rounded-full bg-white/90 p-1.5 text-red-600 shadow-sm transition hover:bg-red-100"
                            aria-label="Remove existing image"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-3">
                <Label htmlFor="gallery" className="text-sm font-medium text-gray-700">
                  Add Gallery Images
                </Label>
                <label
                  htmlFor="gallery"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:border-blue-500 hover:bg-blue-50 transition duration-200 ease-in-out"
                >
                  <ImageIcon className="mb-2 h-6 w-6 text-gray-400" />
                  <span className="text-gray-500 text-sm">Upload multiple gallery images</span>
                  <span className="text-xs text-gray-400">(PNG, JPG, WEBP)</span>
                  <Input
                    type="file"
                    id="gallery"
                    name="gallery"
                    accept="image/*"
                    multiple
                    onChange={handleGalleryChange}
                    className="hidden"
                  />
                </label>

                {isConverting && (
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2 text-xs">
                    <OneLoader size="tiny" inline />
                    Optimizing images...
                  </div>
                )}

                {galleryPreviews.length > 0 && (
                  <div className="grid gap-3">
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      New Gallery Images ({galleryPreviews.length})
                    </Label>
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                      {galleryPreviews.map((preview, index) => (
                        <div
                          key={`${preview.url}-${index}`}
                          className="relative rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
                        >
                          <div className="relative h-32 w-full overflow-hidden rounded-md">
                            <img
                              src={preview.url}
                              alt={preview.name || `Gallery image ${index + 1}`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="mt-3 space-y-1">
                            <p className="line-clamp-1 text-sm font-medium text-gray-800">
                              {preview.name || `Image ${index + 1}`}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(preview.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveGalleryImage(index)}
                            className="absolute right-3 top-3 inline-flex items-center justify-center rounded-full bg-red-100 p-1.5 text-red-600 transition hover:bg-red-200"
                            aria-label="Remove gallery image"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-3">
                <Label htmlFor="description">Description</Label>
                <Input
                  type="text"
                  id="description"
                  name="description"
                  value={inputValue.description}
                  onChange={handleChange}
                  placeholder="Enter Product Description"
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="stock">Stock</Label>
                <Input
                  type="number"
                  id="stock"
                  name="stock"
                  value={inputValue.stock}
                  onChange={handleChange}
                  placeholder="Enter Product Stock"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <OneLoader size="tiny" inline className="mr-2" />
                    Updating...
                  </>
                ) : (
                  'Update Product'
                )}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default UpdateProduct;
