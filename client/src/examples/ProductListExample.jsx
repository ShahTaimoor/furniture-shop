import React from 'react';
import { useProducts } from '@/hooks/use-products';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import OneLoader from '@/components/ui/OneLoader';

/**
 * Example: Product List Component using Redis-backed hook
 * 
 * This component demonstrates:
 * - Fetching products with Redis caching
 * - Loading and error states
 * - Refetch capability
 * - Polling for real-time updates (optional)
 */
const ProductListExample = () => {
  const {
    data: products,
    pagination,
    loading,
    error,
    refetch,
    lastFetchTime,
  } = useProducts({
    filters: {
      category: 'all',
      page: 1,
      limit: 24,
      sortBy: 'az',
    },
    enabled: true,
    pollInterval: 0, // Set to 60000 for 1-minute polling
    refetchOnMount: true,
    onSuccess: (data) => {
      console.log('Products loaded:', data);
    },
    onError: (error) => {
      console.error('Error loading products:', error);
    },
  });

  if (loading && !products.length) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <OneLoader size="large" text="Loading products..." />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-semibold">Failed to load products</p>
              <p className="text-sm text-red-500">{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              className="ml-auto"
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
    <div className="space-y-4">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Products</h2>
          {lastFetchTime && (
            <p className="text-sm text-gray-500">
              Last updated: {new Date(lastFetchTime).toLocaleTimeString()}
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

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map((product) => (
          <Card key={product._id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              {product.picture?.secure_url && (
                <img
                  src={product.picture.secure_url}
                  alt={product.title}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}
              <CardTitle className="text-lg">{product.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    PKR {product.salePrice || product.price || 0}
                  </span>
                  {product.isOnSale && (
                    <Badge variant="destructive">Sale</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {product.description}
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">
                    Stock: {product.stock || 0}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination Info */}
      {pagination && (
        <div className="text-center text-sm text-gray-500">
          Showing {pagination.page} of {pagination.totalPages} pages
          {' '}({pagination.total} total products)
        </div>
      )}

      {/* Loading overlay for refetch */}
      {loading && products.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-3 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Updating products...</span>
        </div>
      )}
    </div>
  );
};

export default ProductListExample;

