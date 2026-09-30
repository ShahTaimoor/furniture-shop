const STORAGE_KEY = 'ecom_recently_viewed';
const MAX_ITEMS = 12;

export const getRecentlyViewed = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const addRecentlyViewed = (product) => {
  if (typeof window === 'undefined' || !product?._id) return;
  try {
    const entry = {
      _id: product._id,
      slug: product.slug,
      title: product.title,
      image: product.image || product.primaryImage || product.picture?.secure_url,
      price: product.price,
      salePrice: product.salePrice,
      compareAtPrice: product.compareAtPrice,
      ratingAverage: product.ratingAverage,
      ratingCount: product.ratingCount,
      stock: product.stock
    };
    const existing = getRecentlyViewed().filter((item) => item._id !== entry._id);
    const updated = [entry, ...existing].slice(0, MAX_ITEMS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage can throw in private browsing / quota-exceeded — safe to ignore
  }
};
