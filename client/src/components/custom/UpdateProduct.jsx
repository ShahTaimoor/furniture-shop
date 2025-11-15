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
import { Loader2 } from 'lucide-react';

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
  const [loading, setLoading] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');

  const { categories } = useSelector((state) => state.categories);
  const { singleProducts } = useSelector((s) => s.products);
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  
  // Get page number from URL params to return to the same page after update
  const searchParams = new URLSearchParams(location.search);
  const returnPage = searchParams.get('page') || '1';

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      const file = files[0];
      setInputValue((values) => ({ ...values, [name]: file }));
      setPreviewImage(URL.createObjectURL(file));
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

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-3">
                 <Label htmlFor="picture" className="text-sm font-medium text-gray-700">
    Picture
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
                      alt="Preview"
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
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
