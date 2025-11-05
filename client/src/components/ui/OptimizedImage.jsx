import React, { useState, useRef, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { cn } from '../../lib/utils';

/**
 * OptimizedImage component with advanced features
 * Features:
 * - Lazy loading with Intersection Observer
 * - WebP format with fallback
 * - Multiple image sizes for responsive design
 * - Blur placeholder
 * - Error handling
 * - Performance optimizations
 */
const OptimizedImage = ({
  src,
  alt,
  className,
  placeholder,
  fallback = '/placeholder-product.jpg',
  width,
  height,
  sizes,
  loading = 'lazy',
  quality = 80,
  blurDataURL,
  priority = false,
  ...props
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(null);
  const [showBlur, setShowBlur] = useState(!!blurDataURL);
  const imgRef = useRef(null);

  // Intersection Observer for lazy loading (skip if priority)
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
    rootMargin: priority ? '0px' : '50px',
    skip: priority
  });

  // Check WebP support
  const supportsWebP = () => {
    if (typeof window === 'undefined') return false;
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  };

  // Generate optimized URL
  const getOptimizedUrl = (originalUrl, options = {}) => {
    if (!originalUrl) return null;
    
    const { width: w, height: h, quality: q = quality } = options;
    
    // If it's already a WebP URL, return as is
    if (originalUrl.includes('.webp')) return originalUrl;
    
    // If it's a Cloudinary URL, add transformations
    if (originalUrl.includes('cloudinary.com')) {
      const parts = originalUrl.split('/');
      const uploadIndex = parts.findIndex(part => part === 'upload');
      if (uploadIndex !== -1 && uploadIndex < parts.length - 1) {
        let transformations = [];
        
        if (supportsWebP()) {
          transformations.push('f_webp');
        }
        
        if (q) {
          transformations.push(`q_${q}`);
        }
        
        if (w) {
          transformations.push(`w_${w}`);
        }
        
        if (h) {
          transformations.push(`h_${h}`);
        }
        
        if (transformations.length > 0) {
          parts[uploadIndex + 1] = transformations.join(',');
        }
        
        return parts.join('/');
      }
    }
    
    // For other URLs, try to convert to WebP
    if (supportsWebP()) {
      return originalUrl.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    }
    
    return originalUrl;
  };

  // Load image when in view or if priority
  useEffect(() => {
    if ((inView || priority) && src && !currentSrc) {
      const optimizedUrl = getOptimizedUrl(src, { width, height });
      setCurrentSrc(optimizedUrl);
    }
  }, [inView, priority, src, currentSrc, width, height]);

  // Handle image load
  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
    setShowBlur(false);
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
    
    const breakpoints = [150, 300, 600, 1200, 1920];
    return breakpoints
      .map(bp => {
        const optimizedUrl = getOptimizedUrl(baseUrl, { width: bp, quality });
        return `${optimizedUrl} ${bp}w`;
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
      {/* Blur placeholder */}
      {showBlur && blurDataURL && (
        <div
          className="absolute inset-0 bg-cover bg-center filter blur-sm scale-110"
          style={{
            backgroundImage: `url(${blurDataURL})`
          }}
        />
      )}

      {/* Loading placeholder */}
      {!imageLoaded && !imageError && !showBlur && (
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
            'transition-all duration-300',
            imageLoaded ? 'opacity-100' : 'opacity-0',
            'w-full h-full object-cover'
          )}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading={priority ? 'eager' : loading}
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

export default OptimizedImage;