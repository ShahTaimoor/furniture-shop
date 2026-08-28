// Loads an image and resolves once it's ready to be drawn onto a canvas.
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    // Needed so canvas export doesn't get "tainted" when the source is a remote
    // (e.g. Cloudinary) URL rather than a local blob: URL.
    image.crossOrigin = 'anonymous';
    image.src = url;
  });

/**
 * Crops `imageSrc` to the pixel area described by `pixelCrop` (as produced by
 * react-easy-crop's onCropComplete) and returns the result as a File.
 */
export const getCroppedImageFile = async (imageSrc, pixelCrop, fileName = 'banner.png', mimeType = 'image/png') => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'));
        return;
      }
      resolve(new File([blob], fileName, { type: mimeType }));
    }, mimeType);
  });
};
