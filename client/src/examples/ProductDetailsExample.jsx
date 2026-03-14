import React from 'react';
import { useProduct } from '@/hooks/use-product';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import OneLoader from '@/components/ui/OneLoader';

/**
 * Example: Product Details Component using Redis-backed hook
 * 
 * This component demonstrates:
 * - Fetching single product with Redis caching
 * - Loading and error states
 * - Refetch capability
 */
const ProductDetailsExample = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    data: product,
    loading,
    error,
    refetch,
    lastFetchTime,
  } = useProduct(id, {
    enabled: !!id,
    onSuccess: (data) => {
      console.log('Product loaded:', data);
    },
    onError: (error) => {
      console.error('Error loading product:', error);
    },
  });

  if (loading && !product) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <OneLoader size="large" text="Loading product..." />
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
              <p className="font-semibold">Failed to load product</p>
              <p className="text-sm text-red-500">{error}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={refetch}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!product) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p>Product not found</p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Products
        </Button>
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

      {/* Product Details */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-3xl">{product.title}</CardTitle>
            <div className="flex gap-2">
              {product.isFeatured && <Badge>Featured</Badge>}
              {product.isOnSale && <Badge variant="destructive">Sale</Badge>}
              {product.isBestseller && <Badge variant="secondary">Bestseller</Badge>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Product Images */}
            <div>
              {product.picture?.secure_url && (
                <img
                  src={product.picture.secure_url}
                  alt={product.title}
                  className="w-full h-96 object-cover rounded-lg"
                />
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Price</p>
                <p className="text-3xl font-bold">
                  PKR {product.salePrice || product.price || 0}
                </p>
                {product.compareAtPrice && (
                  <p className="text-lg text-gray-400 line-through">
                    PKR {product.compareAtPrice}
                  </p>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-500">Stock</p>
                <Badge variant={product.stock > 0 ? 'default' : 'destructive'}>
                  {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                </Badge>
              </div>

              <div>
                <p className="text-sm text-gray-500">Description</p>
                <p className="text-gray-700">{product.description}</p>
              </div>

              {lastFetchTime && (
                <p className="text-xs text-gray-400">
                  Last updated: {new Date(lastFetchTime).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductDetailsExample;

