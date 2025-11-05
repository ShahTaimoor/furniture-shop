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
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import { SingleCategory, updateCategory } from '@/redux/slices/categories/categoriesSlice';

const UpdateCategory = () => {
    const dispatch = useDispatch();
    const [catName, setCatName] = useState('');
    const [position, setPosition] = useState('');
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const { slug } = useParams();

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);

        const updateData = { name: catName, slug };
        if (position !== '') {
            updateData.position = parseInt(position);
        }

        dispatch(updateCategory(updateData))
            .unwrap()
            .then((response) => {
                if (response?.success) {
                    toast.success(response?.message);
                    navigate('/admin/category');
                } else {
                    toast.error(response?.message || 'Failed to update category');
                }
                setLoading(false);
            })
            .catch((error) => {
                toast.error(error || 'Failed to update category');
                setLoading(false);
            });
    };

    useEffect(() => {
        setLoading(true);
        dispatch(SingleCategory(slug))
            .unwrap()
            .then((response) => {
                if (response?.success) {
                    const categoryName = response.data.category?.name || '';
                    // Format the category name to title case
                    const formattedName = categoryName
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                        .join(' ');
                    setCatName(formattedName);
                    setPosition(response.data.category?.position || '');
                } else {
                    toast.error(response?.message || 'Failed to fetch category');
                }
            })
            .catch((error) => {
                toast.error(error || 'Failed to fetch category');
            })
            .finally(() => setLoading(false));
    }, [dispatch, slug]);

    return (
        <div className="w-full max-w-2xl mx-auto p-4">
            <Card>
                <CardHeader>
                    <CardTitle>Update Category</CardTitle>
                    <CardDescription>
                        Update the category name and position. Lower position numbers appear first.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="categoryName">Category Name</Label>
                            <Input
                                id="categoryName"
                                type="text"
                                value={catName}
                                onChange={(e) => setCatName(e.target.value)}
                                placeholder="Enter category name"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="categoryPosition">Position (Optional)</Label>
                            <Input
                                id="categoryPosition"
                                type="number"
                                value={position}
                                onChange={(e) => setPosition(e.target.value)}
                                placeholder="Enter position number (1, 2, 3...)"
                                min="1"
                                disabled={loading}
                            />
                            <p className="text-sm text-muted-foreground">
                                Lower numbers appear first. Leave empty to keep current position.
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <Button 
                                type="submit" 
                                disabled={loading}
                                className="flex-1"
                            >
                                {loading ? 'Updating...' : 'Update Category'}
                            </Button>
                            <Button 
                                type="button" 
                                variant="outline"
                                onClick={() => navigate('/admin/category')}
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default UpdateCategory;
