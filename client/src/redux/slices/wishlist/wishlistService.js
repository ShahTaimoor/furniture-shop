import axiosInstance from '../auth/axiosInstance';

const fetchWishlist = async () => {
  const response = await axiosInstance.get('/wishlist');
  return response.data;
};

const addWishlistItem = async ({ productId, variantId }) => {
  const response = await axiosInstance.post('/wishlist/add', { productId, variantId });
  return response.data;
};

const removeWishlistItem = async ({ productId, variantId }) => {
  const response = await axiosInstance.post('/wishlist/remove', { productId, variantId });
  return response.data;
};

const clearWishlist = async () => {
  const response = await axiosInstance.post('/wishlist/clear');
  return response.data;
};

const wishlistService = {
  fetchWishlist,
  addWishlistItem,
  removeWishlistItem,
  clearWishlist,
};

export default wishlistService;

