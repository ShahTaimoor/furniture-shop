import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useImageOptimization } from '@/hooks/use-image-optimization';

/**
 * ResponsiveImage
 *  - Auto-generates srcSet/sizes from Cloudinary (or any HTTP image)
 *  - Supports blurred placeholder + lazy loading
 *  - Falls back gracefully when no optimization is possible
 */
const ResponsiveImage = ({
  src,
  alt = 'Product image',
  width = 640,
  height = 640,
  className = '',
  breakpoints = [320, 480, 640, 960, 1280],
  loading = 'lazy',
  decoding = 'async',
  placeholderBlur = true,
}) => {
  const { getOptimizedUrl, generateSrcSet, generateBlurPlaceholder } = useImageOptimization();

  const optimizedSrc = useMemo(
    () => getOptimizedUrl(src, { width, height, fit: 'fill' }) || src,
    [getOptimizedUrl, src, width, height]
  );

  const srcSet = useMemo(
    () => generateSrcSet(src, breakpoints) || undefined,
    [generateSrcSet, src, breakpoints]
  );

  const placeholder = useMemo(
    () => (placeholderBlur ? generateBlurPlaceholder(src) : null),
    [generateBlurPlaceholder, placeholderBlur, src]
  );

  return (
    <img
      src={optimizedSrc}
      srcSet={srcSet}
      sizes="(max-width: 640px) 100vw, 640px"
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      decoding={decoding}
      style={placeholder ? { backgroundImage: `url(${placeholder})`, backgroundSize: 'cover' } : undefined}
      className={`object-cover transition-opacity duration-300 ${className}`}
    />
  );
};

ResponsiveImage.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string,
  width: PropTypes.number,
  height: PropTypes.number,
  className: PropTypes.string,
  breakpoints: PropTypes.arrayOf(PropTypes.number),
  loading: PropTypes.oneOf(['lazy', 'eager']),
  decoding: PropTypes.oneOf(['async', 'auto', 'sync']),
  placeholderBlur: PropTypes.bool,
};

export default ResponsiveImage;

