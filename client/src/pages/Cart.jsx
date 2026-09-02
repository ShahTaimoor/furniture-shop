import { useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, ArrowLeft, Trash2, Minus, Plus, ShieldCheck } from "lucide-react";
import OneLoader from "@/components/ui/OneLoader";
import CartImage from "@/components/ui/CartImage";
import { Button } from "@/components/ui/button";
import { removeFromCart, updateCartQuantity } from "@/redux/slices/cart/cartSlice";
import { toast } from "sonner";
import SEO from "@/components/seo/SEO";
import { selectCurrency } from "@/redux/slices/settings/settingsSlice";
import { formatCurrency } from "@/utils/currency";

const Cart = () => {
  const dispatch = useDispatch();
  const { items: cartItems = [] } = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.auth);
  const currency = useSelector(selectCurrency);
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
      <div className="min-h-screen bg-slate-50/60 py-4 sm:py-6 md:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:gap-6 px-3 sm:px-4">
        <header className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-[0_2px_0_0_#e2e8f0]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                <ShoppingCart className="h-3.5 w-3.5" />
                Shopping Bag
              </p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Your Cart
              </h1>
            </div>
            <Button asChild variant="outline" className="group border-slate-200 text-slate-700 shadow-[0_2px_0_0_#e2e8f0] hover:border-slate-300 active:translate-y-[1px] active:shadow-none">
              <Link to="/products" className="flex items-center gap-1.5 text-xs font-semibold">
                <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-1" />
                Continue shopping
              </Link>
            </Button>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Review your selected items, update quantities, and move seamlessly to checkout.
          </p>
        </header>

        {cartItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 sm:p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 border border-slate-200">
              <ShoppingCart className="h-6 w-6 text-slate-400" />
            </div>
            <h2 className="mt-4 text-xl sm:text-2xl font-bold text-slate-900">Your cart is empty</h2>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              Explore our latest Ecommerce collections and add pieces you love to your cart.
            </p>
            <Button asChild className="mt-5 bg-slate-900 text-white shadow-[0_3px_0_0_#020617] hover:bg-slate-800 active:translate-y-[2px] active:shadow-none">
              <Link to="/products">Browse products</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1.7fr_1fr] items-start">
            <section className="space-y-3">
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
                    className="group relative overflow-hidden rounded-xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-[0_2px_0_0_#e2e8f0] transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_4px_0_0_#cbd5e1]"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="relative shrink-0">
                        <CartImage
                          src={product.picture?.secure_url || product.image}
                          alt={product.title}
                          className="h-20 w-20 sm:h-24 sm:w-24 rounded-lg border border-slate-200 object-cover bg-slate-50"
                          fallback="/logo.svg"
                          quality={80}
                        />
                      </div>

                      <div className="flex flex-1 flex-col gap-2">
                        <div className="flex flex-col gap-0.5">
                          <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                            {product.title}
                          </h3>
                          <p className="text-xs text-slate-400">
                            {stock > 0 ? `${stock} in stock` : "Currently unavailable"}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          {/* 3D Stepper Button */}
                          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 shadow-inner">
                            <button
                              className="flex h-7 w-7 items-center justify-center rounded-l-lg text-slate-600 transition hover:bg-white active:bg-slate-200 disabled:opacity-40"
                              onClick={() => handleUpdateQuantity(product._id, quantity - 1, stock)}
                              disabled={isUpdating}
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="min-w-[2rem] text-center text-xs font-bold text-slate-800">
                              {quantity}
                            </span>
                            <button
                              className="flex h-7 w-7 items-center justify-center rounded-r-lg text-slate-600 transition hover:bg-white active:bg-slate-200 disabled:opacity-40"
                              onClick={() => handleUpdateQuantity(product._id, quantity + 1, stock)}
                              disabled={isUpdating}
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          <button
                            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-red-600 disabled:opacity-60"
                            onClick={() => handleRemove(product._id)}
                            disabled={isRemoving}
                          >
                            {isRemoving ? <OneLoader size="tiny" inline /> : <Trash2 className="h-3.5 w-3.5" />}
                            <span>{isRemoving ? 'Removing...' : 'Remove'}</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-1 text-right min-w-[100px] border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                        <div className="flex items-center gap-1.5 text-sm sm:text-base font-bold text-slate-900">
                          {formatCurrency(salePrice * quantity, currency)}
                          {isUpdating && <OneLoader size="tiny" inline />}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {isOnSale ? (
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-slate-700">{formatCurrency(salePrice, currency)}</span>
                              <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider text-emerald-700 border border-emerald-200">
                                Sale
                              </span>
                            </div>
                          ) : (
                            <>{formatCurrency(price, currency)} each</>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>

            <aside className="lg:sticky lg:top-20">
              <div className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-[0_2px_0_0_#e2e8f0]">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Order Summary</h2>
                    <p className="text-[11px] text-slate-500">
                      Taxes included. Delivery calculated at checkout.
                    </p>
                  </div>
                  <div className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 border border-slate-200">
                    {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}
                  </div>
                </div>

                <div className="space-y-2.5 text-xs sm:text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span className="font-bold text-slate-900">{formatCurrency(totalPrice, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Shipping</span>
                    <span className="text-slate-400">Calculated next step</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Estimated taxes</span>
                    <span className="text-slate-400">Included</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2.5 text-sm sm:text-base font-bold text-slate-900">
                    <div className="flex items-center justify-between">
                      <span>Total</span>
                      <span>{formatCurrency(totalPrice, currency)}</span>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full bg-slate-900 text-white font-bold shadow-[0_3px_0_0_#020617] hover:bg-slate-800 active:translate-y-[2px] active:shadow-none"
                  onClick={() => {
                    if (cartItems.length === 0) {
                      toast.error("Your cart is empty.");
                      return;
                    }
                    navigate("/checkout");
                  }}
                >
                  Proceed to Checkout
                </Button>

                <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs text-slate-500">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <p className="text-[11px] leading-tight">
                    Bank-grade encrypted checkout. Your payment data is never stored.
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

