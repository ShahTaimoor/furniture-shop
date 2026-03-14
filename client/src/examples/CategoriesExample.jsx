import React from 'react';
import { useCategories } from '@/hooks/use-categories';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, AlertCircle, FolderTree } from 'lucide-react';
import OneLoader from '@/components/ui/OneLoader';

/**
 * Example: Categories Component using Redis-backed hook
 * 
 * This component demonstrates:
 * - Fetching categories with Redis caching (1 hour cache)
 * - Loading and error states
 * - Refetch capability
 * - Displaying both tree and flat structures
 */
const CategoriesExample = () => {
  const {
    tree,
    flat,
    loading,
    error,
    refetch,
    lastFetchTime,
  } = useCategories({
    enabled: true,
    onSuccess: (data) => {
      console.log('Categories loaded:', data);
    },
    onError: (error) => {
      console.error('Error loading categories:', error);
    },
  });

  if (loading && !tree.length) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <OneLoader size="large" text="Loading categories..." />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <div className="flex-1">
              <p className="font-semibold">Failed to load categories</p>
              <p className="text-sm text-red-500">{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FolderTree className="h-6 w-6" />
            Categories
          </h2>
          {lastFetchTime && (
            <p className="text-sm text-gray-500">
              Last updated: {new Date(lastFetchTime).toLocaleTimeString()}
              {' '}(Cached for 1 hour)
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refetch}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </>
          )}
        </Button>
      </div>

      {/* Categories Tree */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Category Tree</h3>
          <div className="space-y-2">
            {tree.length > 0 ? (
              tree.map((category) => (
                <CategoryTreeItem key={category._id} category={category} level={0} />
              ))
            ) : (
              <p className="text-gray-500">No categories found</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Categories Flat List */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">All Categories ({flat.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {flat.map((category) => (
              <div
                key={category._id}
                className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <p className="font-medium">{category.name}</p>
                {category.slug && (
                  <p className="text-sm text-gray-500">{category.slug}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Helper component for recursive tree rendering
const CategoryTreeItem = ({ category, level }) => {
  const indent = level * 20;

  return (
    <div style={{ marginLeft: `${indent}px` }} className="py-1">
      <div className="flex items-center gap-2">
        <span className="font-medium">{category.name}</span>
        {category.picture?.secure_url && (
          <img
            src={category.picture.secure_url}
            alt={category.name}
            className="w-6 h-6 rounded object-cover"
          />
        )}
      </div>
      {category.children && category.children.length > 0 && (
        <div className="mt-1">
          {category.children.map((child) => (
            <CategoryTreeItem
              key={child._id}
              category={child}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoriesExample;

