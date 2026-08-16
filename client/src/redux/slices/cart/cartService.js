import axiosInstance from '../auth/axiosInstance';

// Get current user's cart
export const fetchCart = async () => {
  const res = await axiosInstance.get('/pg/cart', {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return res.data;
};

// Add or update item in cart
export const addToCart = async ({ productId, quantity, variationId }) => {
  const payload = variationId ? { productId, quantity, variationId } : { productId, quantity };
  const res = await axiosInstance.post('/pg/cart/add', payload, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return res.data;
};

// Remove item from cart
export const removeFromCart = async (productId) => {
  const res = await axiosInstance.post('/pg/cart/remove', { productId }, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return res.data;
};

// Empty cart
export const emptyCart = async () => {
  const res = await axiosInstance.post('/pg/cart/empty', {}, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return res.data;
};

// Update quantity of an item in cart
export const updateCartQuantity = async ({ productId, quantity }) => {
  const res = await axiosInstance.post('/pg/cart/update', { productId, quantity }, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return res.data;
};
