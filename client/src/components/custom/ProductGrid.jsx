import React, { useMemo } from 'react';
import ProductCard from './ProductCard';
import OneLoader from '../ui/OneLoader';

const ProductGrid = React.memo(({ 
  products, 
  loading, 
  gridType, 
  quantities, 
  onQuantityChange, 
  onAddToCart, 
  addingProductId, 
  cartItems, 
  onPreviewImage,
  searchTerm = ''
}) => {
  const isInCartMap = useMemo(() => {
    const map = new Map();
    cartItems.forEach(item => {
      const productId = item.product?._id || item.product;
      if (productId) {
        map.set(productId, true);
      }
    });
    return map;
  }, [cartItems]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <OneLoader size="large" text="Loading Products..." />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-lg text-gray-500 mb-4">
          No products found for your search.
        </p>
        <p className="text-sm text-gray-400">
          Try adjusting your search terms or browse our categories.
        </p>
      </div>
    );
  }

  return (
    <div className={`px-2 sm:px-0 ${
      gridType === 'grid2' 
        ? 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' 
        : 'flex flex-col space-y-0.5'
    }`}>
      {products.filter(product => product && product._id).map((product) => (
        <ProductCard
          key={product._id}
          product={product}
          quantity={quantities[product._id] || 1}
          onQuantityChange={onQuantityChange}
          onAddToCart={onAddToCart}
          isAddingToCart={addingProductId === product._id}
          isInCart={isInCartMap.get(product._id) || false}
          gridType={gridType}
          setPreviewImage={onPreviewImage}
          searchTerm={searchTerm}
        />
      ))}
    </div>
  );
});

export default ProductGrid;

