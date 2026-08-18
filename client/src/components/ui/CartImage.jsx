import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import OneLoader from './OneLoader';

/**
 * CartImage component optimized for cart drawer
 * Features:
 * - Immediate loading (no lazy loading)
 * - WebP format with fallback
 * - Loading placeholder with skeleton
 * - Error handling with fallback image
 * - Optimized for small cart images
 */
const CartImage = ({
  src,
  alt,
  className,
  fallback = '/fallback.jpg',
  width, // optional CSS width (px)
  height, // optional CSS height (px)
  quality = 70, // 1-100 or 'auto' upstream callers might pass
  targetWidthPx, // explicit target display width in px (used for CDN resize)
  targetHeightPx, // explicit target display height in px (used for CDN resize)
  ...props
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(null);
  const imgRef = useRef(null);

  // Resolve intended display size (defaults to 48x48 which matches Tailwind w-12 h-12)
  const resolvedDisplayWidth = typeof targetWidthPx === 'number'
    ? targetWidthPx
    : (typeof width === 'number' ? width : 48);
  const resolvedDisplayHeight = typeof targetHeightPx === 'number'
    ? targetHeightPx
    : (typeof height === 'number' ? height : 48);

  // Device pixel ratio for crisp images on high-DPI screens
  const getDpr = () => {
    if (typeof window === 'undefined') return 1;
    const dpr = Math.max(1, Math.min(3, Math.round(window.devicePixelRatio || 1)));
    return dpr;
  };

  // Check WebP support
  const supportsWebP = () => {
    if (typeof window === 'undefined') return false;
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  };

  // Generate optimized URL for cart images
  const getOptimizedUrl = (originalUrl) => {
    if (!originalUrl) return null;
    
    // If it's already a WebP URL, return as is
    if (originalUrl.includes('.webp')) return originalUrl;
    
    // If it's a Cloudinary URL, add WebP transformation for cart size
    if (originalUrl.includes('cloudinary.com')) {
      const parts = originalUrl.split('/');
      const uploadIndex = parts.findIndex(part => part === 'upload');
      if (uploadIndex !== -1 && uploadIndex < parts.length - 1) {
        const dpr = getDpr();
        const targetW = Math.max(1, Math.round(resolvedDisplayWidth * dpr));
        const targetH = Math.max(1, Math.round(resolvedDisplayHeight * dpr));
        let transformations = [];
        
        if (supportsWebP()) {
          transformations.push('f_webp');
        }
        
        // Prefer automatic quality if passed as 'auto'
        transformations.push(`q_${quality === 'auto' ? 'auto:good' : quality}`);
        transformations.push(`dpr_${dpr}`);
        transformations.push(`w_${targetW}`);
        transformations.push(`h_${targetH}`);
        transformations.push('c_fill'); // sized crop
        transformations.push('g_auto'); // automatic gravity for best subject
        transformations.push('fl_progressive'); // Progressive loading
        
        parts[uploadIndex + 1] = transformations.join(',');
        return parts.join('/');
      }
    }
    
    // For other URLs, try to convert to WebP
    if (supportsWebP()) {
      return originalUrl.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    }
    
    return originalUrl;
  };

  // Load image immediately when component mounts
  useEffect(() => {
    if (src && !currentSrc) {
      const optimizedUrl = getOptimizedUrl(src);
      setCurrentSrc(optimizedUrl);
    } else if (!src) {
      // If no src, show fallback immediately
      setCurrentSrc(fallback);
      setImageError(true);
    }
  }, [src, currentSrc, fallback, resolvedDisplayWidth, resolvedDisplayHeight]);

  // Handle image load
  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  // Handle image error
  const handleImageError = () => {
    if (currentSrc && currentSrc !== src && currentSrc !== fallback) {
      // Try fallback to original format
      setCurrentSrc(src);
    } else if (currentSrc !== fallback) {
      // Use fallback image
      setCurrentSrc(fallback);
      setImageError(true);
    }
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden flex-shrink-0',
        className
      )}
      style={{ width, height }}
    >
      {/* Loading placeholder */}
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
          <OneLoader size="tiny" showText={false} />
        </div>
      )}

      {/* Actual image */}
      {currentSrc && (
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          className={cn(
            'transition-opacity duration-200',
            imageLoaded ? 'opacity-100' : 'opacity-0',
            'w-full h-full object-contain object-center bg-white'
          )}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="eager"
          decoding="async"
          fetchpriority="high"
          {...props}
        />
      )}

      {/* Error state */}
      {imageError && (
        <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="w-10 h-10 mx-auto mb-2 bg-gray-200 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-xs font-medium">No image</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartImage;
