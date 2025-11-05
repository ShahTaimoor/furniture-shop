import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for image optimization utilities
 */
export const useImageOptimization = () => {
  const [webpSupport, setWebpSupport] = useState(false);

  // Check WebP support
  useEffect(() => {
    const checkWebPSupport = () => {
      if (typeof window === 'undefined') return false;
      
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const isSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
      setWebpSupport(isSupported);
      return isSupported;
    };

    checkWebPSupport();
  }, []);

  // Generate optimized image URL
  const getOptimizedUrl = useCallback((url, options = {}) => {
    if (!url) return null;

    const {
      width,
      height,
      quality = 80,
      format = 'webp',
      fit = 'cover'
    } = options;

    // If it's a Cloudinary URL
    if (url.includes('cloudinary.com')) {
      const parts = url.split('/');
      const uploadIndex = parts.findIndex(part => part === 'upload');
      
      if (uploadIndex !== -1 && uploadIndex < parts.length - 1) {
        let transformations = [];
        
        if (format === 'webp' && webpSupport) {
          transformations.push('f_webp');
        }
        
        if (quality) {
          transformations.push(`q_${quality}`);
        }
        
        if (width) {
          transformations.push(`w_${width}`);
        }
        
        if (height) {
          transformations.push(`h_${height}`);
        }
        
        if (fit) {
          transformations.push(`c_${fit}`);
        }
        
        if (transformations.length > 0) {
          parts[uploadIndex + 1] = transformations.join(',');
        }
        
        return parts.join('/');
      }
    }

    // For other URLs, try to convert to WebP
    if (format === 'webp' && webpSupport) {
      return url.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    }

    return url;
  }, [webpSupport]);

  // Generate responsive srcSet
  const generateSrcSet = useCallback((baseUrl, breakpoints = [150, 300, 600, 1200, 1920]) => {
    if (!baseUrl) return null;

    return breakpoints
      .map(bp => {
        const optimizedUrl = getOptimizedUrl(baseUrl, { width: bp });
        return `${optimizedUrl} ${bp}w`;
      })
      .join(', ');
  }, [getOptimizedUrl]);

  // Generate blur placeholder
  const generateBlurPlaceholder = useCallback((url, width = 10, quality = 20) => {
    if (!url) return null;
    
    return getOptimizedUrl(url, {
      width,
      quality,
      fit: 'scale'
    });
  }, [getOptimizedUrl]);

  // Preload image
  const preloadImage = useCallback((url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }, []);

  // Get image dimensions
  const getImageDimensions = useCallback((url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
          aspectRatio: img.naturalWidth / img.naturalHeight
        });
      };
      img.onerror = reject;
      img.src = url;
    });
  }, []);

  return {
    webpSupport,
    getOptimizedUrl,
    generateSrcSet,
    generateBlurPlaceholder,
    preloadImage,
    getImageDimensions
  };
};
