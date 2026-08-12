import { useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, ArrowLeft, Trash2, Minus, Plus, ShieldCheck, Loader2 } from "lucide-react";
import CartImage from "@/components/ui/CartImage";
import { Button } from "@/components/ui/button";
import { removeFromCart, updateCartQuantity } from "@/redux/slices/cart/cartSlice";
import { toast } from "sonner";
import SEO from "@/components/seo/SEO";

const Cart = () => {
  const dispatch = useDispatch();
  const { items: cartItems = [] } = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [updatingItems, setUpdatingItems] = useState({});
  const [removingItems, setRemovingItems] = useState({});

  const totalQuantity = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const totalPrice = useMemo(
    () =>
      cartItems.reduce((sum, item) => {
        const price = item.product.price || 0;
        return sum + price * item.quantity;
      }, 0),
    [cartItems]
  );

  const handleUpdateQuantity = async (productId, quantity, stock) => {
    if (quantity < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }
    if (stock && quantity > stock) {
      toast.error(`Only ${stock} left in stock`);
      return;
    }
    setUpdatingItems((prev) => ({ ...prev, [productId]: true }));
    try {
      await dispatch(updateCartQuantity({ productId, quantity })).unwrap();
    } catch (error) {
      const message = error?.message || "Unable to update quantity";
      toast.error(message);
    } finally {
      setUpdatingItems((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    }
  };

  const handleRemove = async (productId) => {
    setRemovingItems((prev) => ({ ...prev, [productId]: true }));
    try {
      await dispatch(removeFromCart(productId)).unwrap();
      toast.success("Product removed from cart");
    } catch (error) {
      const message = error?.message || "Unable to remove product";
      toast.error(message);
    } finally {
      setRemovingItems((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    }
  };

  return (
    <>
      <SEO
        title="Shopping Cart"
        description="Review the items saved in your Ecommerce shopping bag, update quantities, and move securely to checkout."
        keywords={["Ecommerce cart", "shopping bag", "review order"]}
        noIndex
      />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
                <ShoppingCart className="h-4 w-4" />
                Review & refine
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                Your Cart
              </h1>
            </div>
            <Button asChild variant="outline" className="group border-slate-200 text-slate-700">
              <Link to="/products" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
                Continue shopping
              </Link>
            </Button>
          </div>
          <p className="max-w-2xl text-sm text-slate-500">
            Double-check product details, adjust quantities, and move to checkout when you’re ready.
            We reserve items in your bag for a limited time.
          </p>
        </header>

        {cartItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-12 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <ShoppingCart className="h-7 w-7 text-slate-400" />
            </div>
            <h2 className="mt-6 text-2xl font-semibold text-slate-900">Your cart is empty</h2>
            <p className="mt-3 text-sm text-slate-500">
              Explore our latest collections and add the pieces you love to your bag.
            </p>
            <Button asChild className="mt-6 bg-slate-900 text-white hover:bg-slate-900/90">
              <Link to="/products">Browse products</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[1.7fr_1fr]">
            <section className="space-y-5">
              {cartItems.map((item) => {
                const { product, quantity } = item;
                const stock = product.stock ?? 0;
                const price = product.price ?? 0;
                const salePrice = product.salePrice ?? price;
                const isOnSale = salePrice !== price;
                const isUpdating = Boolean(updatingItems[product._id]);
                const isRemoving = Boolean(removingItems[product._id]);

                return (
                  <article
                    key={product._id}
                    className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
                  >
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                      <div className="relative shrink-0">
                        <div className="absolute inset-0 rounded-2xl bg-slate-100 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                        <CartImage
                          src={product.picture?.secure_url || product.image}
                          alt={product.title}
                          className="relative h-28 w-28 rounded-2xl border border-slate-200 object-cover shadow-inner sm:h-32 sm:w-32"
                          fallback="/logo.svg"
                          quality={80}
                        />
                      </div>

                      <div className="flex flex-1 flex-col gap-4">
                        <div className="flex flex-col gap-1">
                          <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                            {product.title}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {stock > 0 ? `${stock} in stock` : "Currently unavailable"}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex items-center rounded-full border border-slate-200 bg-slate-50/60">
                            <button
                              className="flex h-9 w-9 items-center justify-center rounded-l-full text-slate-600 transition hover:bg-white"
                              onClick={() => handleUpdateQuantity(product._id, quantity - 1, stock)}
                              disabled={isUpdating}
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="min-w-[2.5rem] text-center text-sm font-semibold text-slate-800">
                              {quantity}
                            </span>
                            <button
                              className="flex h-9 w-9 items-center justify-center rounded-r-full text-slate-600 transition hover:bg-white"
                              onClick={() => handleUpdateQuantity(product._id, quantity + 1, stock)}
                              disabled={isUpdating}
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>

                          <button
                            className="flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-800 disabled:opacity-60"
                            onClick={() => handleRemove(product._id)}
                            disabled={isRemoving}
                          >
                            {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            {isRemoving ? 'Removing...' : 'Remove'}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col items-end justify-between gap-3 text-right min-w-[120px]">
                        <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                          £{(salePrice * quantity).toFixed(2)}
                          {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-label="Updating price" />}
                        </div>
                        <div className="text-xs text-slate-500">
                          {isOnSale ? (
                            <>
                              <span className="font-medium text-slate-800">£{salePrice.toFixed(2)}</span>{" "}
                              each
                              <span className="ml-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                                Sale
                              </span>
                            </>
                          ) : (
                            <>£{price.toFixed(2)} each</>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>

            <aside className="lg:sticky lg:top-24">
              <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Order summary</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Prices include VAT. Delivery calculates at checkout.
                    </p>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 flex items-center gap-1">
                    <span>{totalQuantity}</span>
                    <span>items</span>
                  </div>
                </div>

                <div className="space-y-4 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span className="font-medium text-slate-900">£{totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Shipping</span>
                    <span className="text-slate-400">Calculated at checkout</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Estimated taxes</span>
                    <span className="text-slate-400">Included</span>
                  </div>
                  <div className="border-t border-dashed border-slate-200 pt-4 text-base font-semibold text-slate-900">
                    <div className="flex items-center justify-between">
                      <span>Total (GBP)</span>
                      <span>£{totalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full bg-slate-900 text-white shadow-xl shadow-slate-900/10 transition hover:bg-slate-900/90"
                  onClick={() => {
                    if (cartItems.length === 0) {
                      toast.error("Your cart is empty.");
                      return;
                    }
                    navigate("/checkout");
                  }}
                >
                  Proceed to checkout
                </Button>

                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-xs text-slate-500">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  <p>
                    Secure checkout. We protect your data with bank-level encryption and never store
                    your payment details.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
      </div>
    </>
  );
};

export default Cart;

