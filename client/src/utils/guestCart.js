// Lightweight cart for logged-out shoppers. The backend cart is entirely
// login-gated (see backend/routes/pgCartRoutes.js), so guests need somewhere
// client-side to hold items until they either check out as a guest or log in
// (at which point the items get merged into their real server cart).
const STORAGE_KEY = 'guest_cart_v1';

const safeParse = (raw) => {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const getGuestCartItems = () => {
  if (typeof window === 'undefined') return [];
  try {
    return safeParse(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
};

const persist = (items) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — cart just won't persist across reloads.
  }
  return items;
};

// Adds `quantity` to an existing matching line (same product + variation) or appends a new one.
export const addGuestCartItem = ({ productId, variationId = null, quantity = 1 }) => {
  const items = getGuestCartItems();
  const existing = items.find((item) => item.productId === productId && item.variationId === (variationId || null));
  if (existing) {
    existing.quantity += quantity;
  } else {
    items.push({ productId, variationId: variationId || null, quantity });
  }
  return persist(items);
};

export const removeGuestCartItem = (productId, variationId = null) => {
  const items = getGuestCartItems().filter(
    (item) => !(item.productId === productId && item.variationId === (variationId || null))
  );
  return persist(items);
};

export const updateGuestCartItemQuantity = (productId, quantity, variationId = null) => {
  const items = getGuestCartItems()
    .map((item) =>
      item.productId === productId && item.variationId === (variationId || null)
        ? { ...item, quantity }
        : item
    )
    .filter((item) => item.quantity > 0);
  return persist(items);
};

export const clearGuestCartItems = () => persist([]);
