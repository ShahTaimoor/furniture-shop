import React, { useMemo } from 'react';
import ProductCard from './ProductCard';
import ProductCardSkeleton from './ProductCardSkeleton';

const ProductGrid = React.memo(({
  products,
  loading,
  gridType,
  columns = 5,
  quantities,
  onQuantityChange,
  onAddToCart,
  addingProductId,
  cartItems,
  onProductClick,
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

  const gridStyle = gridType === 'grid2'
    ? { '--cols': columns }
    : undefined;
  const gridColsClass = gridType === 'grid2'
    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:[grid-template-columns:repeat(var(--cols),minmax(0,1fr))]'
    : '';

  if (loading) {
    return (
      <div
        className={`px-2 sm:px-0 ${
          gridType === 'grid2'
            ? `grid gap-2 ${gridColsClass}`
            : 'flex flex-col space-y-3'
        }`}
        style={gridStyle}
      >
        {Array.from({ length: gridType === 'grid2' ? 12 : 6 }).map((_, i) => (
          <ProductCardSkeleton key={i} gridType={gridType} />
        ))}
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
    <div
      className={`px-2 sm:px-0 ${
        gridType === 'grid2'
          ? `grid gap-2 ${gridColsClass}`
          : 'flex flex-col space-y-0.5'
      }`}
      style={gridStyle}
    >
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
          onProductClick={onProductClick}
          searchTerm={searchTerm}
        />
      ))}
    </div>
  );
});

export default ProductGrid;

