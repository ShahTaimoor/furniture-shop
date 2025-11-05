// pages/Category.jsx
import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import {
  AddCategory,
  AllCategory,
  deleteCategory,
  updateCategory,
} from '@/redux/slices/categories/categoriesSlice';
import { 
  Loader2, 
  PlusCircle, 
  Trash2, 
  Edit, 
  X, 
  Check, 
  Search, 
  Filter,
  Grid3X3,
  List,
  MoreVertical,
  Image as ImageIcon,
  Eye,
  Settings
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

const Category = () => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [inputValues, setInputValues] = useState({ name: '', picture: null });
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('name'); // 'name', 'position', 'created'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'
  const { categories, status, error } = useSelector((state) => state.categories);
  

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'picture') {
      const file = files[0];
      if (editingCategory) {
        setEditingCategory({ ...editingCategory, picture: file });
      } else {
        setInputValues((values) => ({ ...values, picture: file }));
      }
    } else {
      if (editingCategory) {
        setEditingCategory({ ...editingCategory, [name]: value });
      } else {
        setInputValues((values) => ({ ...values, [name]: value }));
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingCategory) {
      updateExistingCategory();
    } else {
      addNewCategory();
    }
  };

  const addNewCategory = () => {
    if (!inputValues.name.trim()) {
      toast.error('Category name cannot be empty');
      return;
    }

    const formData = new FormData();
    formData.append('name', inputValues.name);
    formData.append('picture', inputValues.picture);

    setLoading(true);
    dispatch(AddCategory(formData))
      .unwrap()
      .then((response) => {
        if (response?.success) {
          toast.success(response?.message);
          setInputValues({ name: '', picture: null });
          setIsDialogOpen(false);
          dispatch(AllCategory());
        } else {
          toast.error(response?.message || 'Failed to add category');
        }
      })
      .catch((error) => {
        toast.error(error || 'Failed to add category');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const updateExistingCategory = () => {
    if (!editingCategory?.name?.trim()) {
      toast.error('Category name cannot be empty');
      return;
    }

    setLoading(true);
    const updateData = {
      name: editingCategory.name,
      slug: editingCategory.slug,
      picture: editingCategory.picture,
    };
    
    // Add position if it's provided
    if (editingCategory.position !== undefined && editingCategory.position !== '') {
      updateData.position = parseInt(editingCategory.position);
    }

    dispatch(updateCategory(updateData))
      .unwrap()
      .then((response) => {
        if (response?.success) {
          toast.success(response?.message);
          // ✅ Clear form and editing state
          setEditingCategory(null);
          setInputValues({ name: '', picture: null });
          setIsDialogOpen(false);
          dispatch(AllCategory());
        } else {
          toast.error(response?.message || 'Failed to update category');
        }
      })
      .catch((error) => {
        toast.error(error || 'Failed to update category');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleDelete = (category) => {
    setCategoryToDelete(category);
  };

  const confirmDelete = () => {
    if (!categoryToDelete) return;

    setLoading(true);
    dispatch(deleteCategory(categoryToDelete.slug))
      .unwrap()
      .then((response) => {
        if (response?.success) {
          toast.success(response?.message || 'Category deleted successfully');
          dispatch(AllCategory());
        } else {
          toast.error(response?.message || 'Failed to delete category');
        }
      })
      .catch((error) => {
        toast.error(error || 'Failed to delete category');
      })
      .finally(() => {
        setLoading(false);
        setCategoryToDelete(null);
      });
  };

  const startEditing = (category) => {
    setEditingCategory({ ...category, picture: null });
    setIsDialogOpen(true);
  };

  const startAdding = () => {
    setEditingCategory(null);
    setInputValues({ name: '', picture: null });
    setIsDialogOpen(true);
  };

  const cancelEditing = () => {
    setEditingCategory(null);
    setInputValues({ name: '', picture: null });
    setIsDialogOpen(false);
  };

  // Filter and sort categories
  const filteredCategories = categories
    .filter(category =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'position':
          comparison = (a.position || 999) - (b.position || 999);
          break;
        case 'created':
          comparison = new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  useEffect(() => {
    dispatch(AllCategory());
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Categories</h1>
              <p className="text-slate-600 mt-2">Manage your product categories and organize your inventory</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={startAdding} 
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 px-6 py-2.5"
                >
                  <PlusCircle className="h-5 w-5" />
                  Add Category
                </Button>
              </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-xl font-semibold text-slate-900">
                {editingCategory ? 'Update Category' : 'Add New Category'}
              </DialogTitle>
              <DialogDescription className="text-slate-600">
                {editingCategory
                  ? 'Edit the selected category details and image'
                  : 'Create a new product category with name and image'}
              </DialogDescription>
            </DialogHeader>
            
            <form
              encType="multipart/form-data"
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              <div className="space-y-3">
                <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                  Category Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={editingCategory ? editingCategory.name : inputValues.name}
                  onChange={handleChange}
                  placeholder="e.g. Electronics, Clothing, Automotive"
                  required
                  disabled={loading}
                  className="h-11 border-slate-300 focus:border-blue-500 focus:ring-blue-500/20"
                />
              </div>

              {editingCategory && (
                <div className="space-y-3">
                  <Label htmlFor="position" className="text-sm font-medium text-slate-700">
                    Position (Optional)
                  </Label>
                  <Input
                    id="position"
                    name="position"
                    type="number"
                    value={editingCategory.position || ''}
                    onChange={handleChange}
                    placeholder="Enter position number (1, 2, 3...)"
                    min="1"
                    disabled={loading}
                    className="h-11 border-slate-300 focus:border-blue-500 focus:ring-blue-500/20"
                  />
                  <p className="text-sm text-slate-500">
                    Lower numbers appear first. Leave empty to keep current position.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-3">
                  <Label htmlFor="picture" className="text-sm font-medium text-slate-700">
                    Category Image <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <div className="flex justify-center px-6 pt-8 pb-8 border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-200 group">
                      <div className="space-y-3 text-center">
                        <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors duration-200">
                          <ImageIcon className="w-8 h-8 text-slate-400 group-hover:text-blue-500" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex text-sm text-slate-600">
                            <label
                              htmlFor="picture"
                              className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none px-3 py-1 border border-blue-200 hover:border-blue-300 transition-colors"
                            >
                              <span>Choose File</span>
                              <input
                                id="picture"
                                name="picture"
                                type="file"
                                className="sr-only"
                                onChange={handleChange}
                                accept="image/*"
                              />
                            </label>
                            <p className="pl-2 text-slate-500">or drag and drop</p>
                          </div>
                          <p className="text-xs text-slate-400">
                            PNG, JPG, GIF, WEBP up to 5MB
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Image preview */}
                {(inputValues.picture || editingCategory?.picture) && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-lg border">
                    <div className="flex items-start gap-4">
                      <img
                        src={URL.createObjectURL(
                          editingCategory?.picture || inputValues.picture
                        )}
                        alt="Image Preview"
                        className="w-20 h-20 object-cover rounded-lg border border-slate-200"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-slate-900">Selected Image</h4>
                          <button
                            type="button"
                            onClick={() => {
                              if (editingCategory) {
                                setEditingCategory({ ...editingCategory, picture: null });
                              } else {
                                setInputValues((v) => ({ ...v, picture: null }));
                              }
                            }}
                            className="text-sm font-medium text-red-600 hover:text-red-500 flex items-center gap-1"
                          >
                            <X className="w-4 h-4" />
                            Remove
                          </button>
                        </div>
                        <div className="text-sm text-slate-600 space-y-1">
                          <p className="truncate">
                            <span className="font-medium">Name:</span>{' '}
                            {(editingCategory?.picture || inputValues.picture)?.name}
                          </p>
                          <p>
                            <span className="font-medium">Size:</span>{' '}
                            {((editingCategory?.picture || inputValues.picture)?.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          <p>
                            <span className="font-medium">Type:</span>{' '}
                            {(editingCategory?.picture || inputValues.picture)?.type?.split('/')[1]?.toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="pt-6 border-t border-slate-200">
                <div className="flex gap-3 w-full">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={cancelEditing} 
                    disabled={loading}
                    className="flex-1 h-11 border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="flex-1 h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {editingCategory ? 'Updating...' : 'Adding...'}
                      </>
                    ) : (
                      <>
                        {editingCategory ? (
                          <Check className="mr-2 h-4 w-4" />
                        ) : (
                          <PlusCircle className="mr-2 h-4 w-4" />
                        )}
                        {editingCategory ? 'Update Category' : 'Add Category'}
                      </>
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 border-slate-300 focus:border-blue-500 focus:ring-blue-500/20"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Controls */}
            <div className="flex items-center gap-3">
              {/* Sort By */}
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium text-slate-700">Sort by:</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-32 h-9 border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="position">Position</SelectItem>
                    <SelectItem value="created">Created</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Order */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="h-9 px-3 border-slate-300"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>

              {/* View Mode Toggle */}
              <div className="flex items-center border border-slate-300 rounded-lg p-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-7 px-2"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-7 px-2"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Categories</h2>
                <p className="text-sm text-slate-600 mt-1">
                  {filteredCategories.length} of {categories.length} categories
                  {searchTerm && ` matching "${searchTerm}"`}
                </p>
              </div>
              {searchTerm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className="text-slate-600 hover:text-slate-900"
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear Search
                </Button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {status === 'loading' && (
              <div className="flex justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-slate-600">Loading categories...</p>
                </div>
              </div>
            )}

            {status === 'failed' && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
                <div className="text-red-600 mb-2">
                  <X className="h-8 w-8 mx-auto mb-2" />
                  <p className="font-medium">Failed to load categories</p>
                </div>
                <p className="text-red-500 text-sm">{error || 'Something went wrong'}</p>
              </div>
            )}

            {categories && categories.length > 0 ? (
              <>
                {filteredCategories.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <Search className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No categories found</h3>
                    <p className="text-slate-600 mb-4">
                      No categories match your search for "{searchTerm}"
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setSearchTerm('')}
                      className="text-slate-600 hover:text-slate-900"
                    >
                      Clear Search
                    </Button>
                  </div>
                ) : (
                  <>
                    {viewMode === 'grid' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredCategories.map((category, index) => (
                          <div key={category._id} className="group relative bg-white border border-slate-200 rounded-xl hover:shadow-lg transition-all duration-200 overflow-hidden">
                            <div className="aspect-square bg-slate-50 flex items-center justify-center">
                              <img
                                src={category.image}
                                alt={category.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                loading="lazy"
                                onError={(e) => {
                                  e.target.src = '/placeholder-image.png';
                                }}
                              />
                            </div>
                            <div className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <h3 className="font-semibold text-slate-900 text-sm line-clamp-2">
                                  {category.name
                                    .split(' ')
                                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                    .join(' ')
                                  }
                                </h3>
                                <Badge variant="secondary" className="ml-2 text-xs font-mono">
                                  {category.position || index + 1}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-500 mb-3">{category.slug}</p>
                              <div className="flex items-center justify-between">
                                <div className="flex gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => startEditing(category)}
                                    disabled={loading}
                                    className="h-8 px-3 text-xs"
                                  >
                                    <Edit className="h-3 w-3 mr-1" />
                                    Edit
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDelete(category)}
                                        disabled={loading}
                                        className="h-8 px-3 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <Trash2 className="h-3 w-3 mr-1" />
                                        Delete
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete the category <strong>"{category.name}"</strong>? 
                                          This action will:
                                          <ul className="list-disc list-inside mt-2 space-y-1">
                                            <li>Permanently remove the category from the system</li>
                                            <li>Delete the category image</li>
                                            <li>This action cannot be undone</li>
                                          </ul>
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={confirmDelete}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Delete Category
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredCategories.map((category, index) => (
                          <div key={category._id} className="flex items-center p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors duration-200">
                            <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden mr-4">
                              <img
                                src={category.image}
                                alt={category.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  e.target.src = '/placeholder-image.png';
                                }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="font-semibold text-slate-900 truncate">
                                  {category.name
                                    .split(' ')
                                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                    .join(' ')
                                  }
                                </h3>
                                <Badge variant="secondary" className="text-xs font-mono">
                                  {category.position || index + 1}
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-500">{category.slug}</p>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startEditing(category)}
                                disabled={loading}
                                className="h-8 px-3"
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDelete(category)}
                                    disabled={loading}
                                    className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Delete
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete the category <strong>"{category.name}"</strong>? 
                                      This action will:
                                      <ul className="list-disc list-inside mt-2 space-y-1">
                                        <li>Permanently remove the category from the system</li>
                                        <li>Delete the category image</li>
                                        <li>This action cannot be undone</li>
                                      </ul>
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={confirmDelete}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete Category
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              status === 'succeeded' && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <PlusCircle className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No categories yet</h3>
                  <p className="text-slate-600 mb-6">
                    Get started by creating your first category
                  </p>
                  <Button
                    onClick={startAdding}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Your First Category
                  </Button>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Category;
