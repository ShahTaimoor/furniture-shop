import axiosInstance from '../auth/axiosInstance';

const fetchWishlist = async () => {
  const response = await axiosInstance.get('/pg/wishlist');
  return response.data;
};

const addWishlistItem = async ({ productId, variantId }) => {
  const response = await axiosInstance.post('/pg/wishlist/add', { productId, variantId });
  return response.data;
};

const removeWishlistItem = async ({ productId, variantId }) => {
  const response = await axiosInstance.post('/pg/wishlist/remove', { productId, variantId });
  return response.data;
};

const clearWishlist = async () => {
  const response = await axiosInstance.post('/pg/wishlist/clear');
  return response.data;
};

const wishlistService = {
  fetchWishlist,
  addWishlistItem,
  removeWishlistItem,
  clearWishlist,
};

export default wishlistService;

