import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useInView } from 'react-intersection-observer';
import { cn } from '../../lib/utils';

/**
 * LazyImage component with WebP support and fallback
 * Features:
 * - Lazy loading with Intersection Observer
 * - WebP format with fallback to original format
 * - Loading placeholder with skeleton
 * - Error handling with fallback image
 * - Responsive image support
 */

// Cache WebP support detection globally
let webPSupportCache = null;

const checkWebPSupport = () => {
  if (webPSupportCache === null) {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    webPSupportCache = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }
  return webPSupportCache;
};

const LazyImage = ({
  src,
  alt,
  className,
  placeholder = '/logo.jpeg',
  fallback = '/logo.jpeg',
  width,
  height,
  sizes,
  loading = 'lazy',
  quality = 80,
  ...props
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(null);
  const imgRef = useRef(null);

  // Intersection Observer for lazy loading with improved performance
  const { ref, inView } = useInView({
    threshold: 0,
    triggerOnce: true,
    rootMargin: '100px', // Increased for earlier loading
    skip: false
  });

  // Check WebP support (cached globally)
  const supportsWebP = useMemo(() => checkWebPSupport(), []);

  // Generate WebP URL - memoized to avoid recreation
  const getWebPUrl = useMemo(() => (originalUrl) => {
    if (!originalUrl) return null;
    
    // If it's already a WebP URL, return as is
    if (originalUrl.includes('.webp')) return originalUrl;
    
    // If it's a Cloudinary URL, add WebP transformation
    if (originalUrl.includes('cloudinary.com')) {
      const parts = originalUrl.split('/');
      const uploadIndex = parts.findIndex(part => part === 'upload');
      if (uploadIndex !== -1 && uploadIndex < parts.length - 1) {
        parts[uploadIndex + 1] = `f_webp,q_${quality}`;
        return parts.join('/');
      }
    }
    
    // For other URLs, replace extension with .webp
    return originalUrl.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  }, [quality]);

  // Load image when in view
  useEffect(() => {
    if (inView && src && !currentSrc) {
      const webpUrl = supportsWebP ? getWebPUrl(src) : src;
      setCurrentSrc(webpUrl);
    }
  }, [inView, src, currentSrc, supportsWebP, getWebPUrl]);

  // Handle image load
  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  // Handle image error
  const handleImageError = () => {
    if (currentSrc && currentSrc !== src) {
      // Try fallback to original format
      setCurrentSrc(src);
    } else {
      // Use fallback image
      setCurrentSrc(fallback);
      setImageError(true);
    }
  };

  // Generate responsive sizes
  const getResponsiveSizes = () => {
    if (sizes) return sizes;
    
    const defaultSizes = [
      '(max-width: 640px) 100vw',
      '(max-width: 1024px) 50vw',
      '25vw'
    ].join(', ');
    
    return defaultSizes;
  };

  // Generate srcSet for responsive images
  const generateSrcSet = (baseUrl) => {
    if (!baseUrl || imageError) return null;
    
    const sizes = [150, 300, 600, 1200];
    return sizes
      .map(size => {
        const webpUrl = supportsWebP ? getWebPUrl(baseUrl) : baseUrl;
        if (webpUrl.includes('cloudinary.com')) {
          const parts = webpUrl.split('/');
          const uploadIndex = parts.findIndex(part => part === 'upload');
          if (uploadIndex !== -1 && uploadIndex < parts.length - 1) {
            parts[uploadIndex + 1] = `f_webp,q_${quality},w_${size}`;
            return `${parts.join('/')} ${size}w`;
          }
        }
        return `${webpUrl} ${size}w`;
      })
      .join(', ');
  };

  return (
    <div
      ref={ref}
      className={cn(
        'relative overflow-hidden',
        className
      )}
      style={{ width, height }}
    >
      {/* Loading placeholder */}
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
        </div>
      )}

      {/* Actual image */}
      {currentSrc && (
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          className={cn(
            'transition-opacity duration-300',
            imageLoaded ? 'opacity-100' : 'opacity-0',
            'w-full h-full object-cover'
          )}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading={loading}
          sizes={getResponsiveSizes()}
          srcSet={generateSrcSet(src)}
          {...props}
        />
      )}

      {/* Error state */}
      {imageError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="w-12 h-12 mx-auto mb-2 bg-gray-300 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-xs">Image unavailable</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LazyImage;
