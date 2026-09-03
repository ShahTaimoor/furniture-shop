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
      <div className="min-h-screen bg-background bg-grain py-4 sm:py-6 md:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:gap-6 px-3 sm:px-4">
        <header className="animate-rise-in flex flex-col gap-3 rounded-2xl border border-latte bg-card p-4 sm:p-6 shadow-[0_2px_0_0_var(--latte),0_12px_30px_-18px_rgba(43,29,23,0.25)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-caramel-deep">
                <ShoppingCart className="h-3.5 w-3.5" />
                Shopping Bag
              </p>
              <h1 className="mt-1 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-espresso">
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
          <p className="text-xs sm:text-sm text-mocha">
            Review your selected items, update quantities, and move seamlessly to checkout.
          </p>
        </header>

        {cartItems.length === 0 ? (
          <div className="animate-scale-in rounded-2xl border border-dashed border-caramel/40 bg-card p-8 sm:p-14 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-latte-soft border border-latte">
              <ShoppingCart className="h-7 w-7 text-caramel-deep" />
            </div>
            <h2 className="mt-5 font-display text-2xl sm:text-3xl font-semibold text-espresso">Your cart is empty</h2>
            <p className="mt-2 text-xs sm:text-sm text-mocha max-w-md mx-auto">
              Explore our latest collections and add pieces you love to your cart.
            </p>
            <Button asChild size="lg" className="mt-6 btn-3d bg-espresso text-cream hover:bg-espresso-soft">
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
                    className="group animate-rise-in relative overflow-hidden rounded-2xl border border-latte bg-card p-3.5 sm:p-4 shadow-[0_2px_0_0_var(--latte)] transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-caramel/50 hover:shadow-[0_6px_0_0_var(--caramel),0_16px_28px_-14px_rgba(43,29,23,0.25)]"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="relative shrink-0">
                        <CartImage
                          src={product.picture?.secure_url || product.image}
                          alt={product.title}
                          className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl border border-latte object-cover bg-latte-soft transition-transform duration-500 ease-out group-hover:scale-105"
                          fallback="/logo.svg"
                          quality={80}
                        />
                      </div>

                      <div className="flex flex-1 flex-col gap-2">
                        <div className="flex flex-col gap-0.5">
                          <h3 className="font-display text-[15px] font-semibold text-espresso line-clamp-1">
                            {product.title}
                          </h3>
                          <p className="text-xs text-mocha/70">
                            {stock > 0 ? `${stock} in stock` : "Currently unavailable"}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          {/* Stepper */}
                          <div className="flex items-center rounded-full border border-latte bg-latte-soft overflow-hidden">
                            <button
                              className="flex h-8 w-8 items-center justify-center text-mocha transition-colors duration-200 hover:bg-caramel hover:text-espresso active:scale-90 disabled:opacity-40"
                              onClick={() => handleUpdateQuantity(product._id, quantity - 1, stock)}
                              disabled={isUpdating}
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="min-w-[2rem] text-center text-xs font-bold text-espresso">
                              {quantity}
                            </span>
                            <button
                              className="flex h-8 w-8 items-center justify-center text-mocha transition-colors duration-200 hover:bg-caramel hover:text-espresso active:scale-90 disabled:opacity-40"
                              onClick={() => handleUpdateQuantity(product._id, quantity + 1, stock)}
                              disabled={isUpdating}
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          <button
                            className="flex items-center gap-1.5 text-xs font-semibold text-mocha transition-colors duration-200 hover:text-destructive disabled:opacity-60"
                            onClick={() => handleRemove(product._id)}
                            disabled={isRemoving}
                          >
                            {isRemoving ? <OneLoader size="tiny" inline /> : <Trash2 className="h-3.5 w-3.5" />}
                            <span>{isRemoving ? 'Removing...' : 'Remove'}</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-1 text-right min-w-[100px] border-t sm:border-t-0 pt-2 sm:pt-0 border-latte">
                        <div className="flex items-center gap-1.5 text-base sm:text-lg font-bold text-espresso">
                          {formatCurrency(salePrice * quantity, currency)}
                          {isUpdating && <OneLoader size="tiny" inline />}
                        </div>
                        <div className="text-[11px] text-mocha">
                          {isOnSale ? (
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-espresso">{formatCurrency(salePrice, currency)}</span>
                              <span className="rounded-full bg-caramel/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-caramel-deep border border-caramel/40">
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
              <div className="animate-rise-in space-y-4 rounded-2xl border border-latte bg-card p-5 sm:p-6 shadow-[0_2px_0_0_var(--latte),0_18px_40px_-20px_rgba(43,29,23,0.3)]">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-display text-lg font-semibold text-espresso">Order Summary</h2>
                    <p className="text-[11px] text-mocha">
                      Taxes included. Delivery calculated at checkout.
                    </p>
                  </div>
                  <div className="rounded-full bg-latte-soft px-3 py-1 text-xs font-bold text-mocha border border-latte">
                    {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}
                  </div>
                </div>

                <div className="space-y-2.5 text-xs sm:text-sm text-mocha">
                  <div className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span className="font-bold text-espresso">{formatCurrency(totalPrice, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Shipping</span>
                    <span className="text-mocha/60">Calculated next step</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Estimated taxes</span>
                    <span className="text-mocha/60">Included</span>
                  </div>
                  <div className="border-t border-latte pt-3 text-base sm:text-lg font-bold text-espresso">
                    <div className="flex items-center justify-between">
                      <span>Total</span>
                      <span>{formatCurrency(totalPrice, currency)}</span>
                    </div>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full btn-3d bg-espresso text-cream font-semibold tracking-wide hover:bg-espresso-soft"
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

                <div className="flex items-center gap-2.5 rounded-xl bg-latte-soft border border-latte p-3 text-xs text-mocha">
                  <ShieldCheck className="h-4 w-4 text-caramel-deep shrink-0" />
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

