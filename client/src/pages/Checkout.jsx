import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { updateProfile } from "@/redux/slices/auth/authSlice";
import { emptyCart } from "@/redux/slices/cart/cartSlice";
import { Button } from "@/components/ui/button";
import OneLoader from "@/components/ui/OneLoader";
import axiosInstance from "@/redux/slices/auth/axiosInstance";
import axios from "axios";
import { loadStripe } from "@stripe/stripe-js";
import AddressManager from "@/components/custom/AddressManager";
import CouponInput from "@/components/custom/CouponInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import SEO from "@/components/seo/SEO";

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;
import {
  Check,
  CreditCard,
  Edit,
  Home,
  MapPin,
  Phone,
  ShoppingBag,
  ShoppingCart,
  AlertCircle,
  Shield,
  ChevronLeft,
  Wallet,
  Banknote,
  Building2,
  Mail,
  User,
  Truck,
  Clock,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import CartImage from "@/components/ui/CartImage";
import { useAuthDrawer } from "@/contexts/AuthDrawerContext";
import {
  selectCurrency,
  selectStandardShippingCost,
  selectExpressShippingCost,
  selectFreeShippingThreshold,
} from "@/redux/slices/settings/settingsSlice";
import { formatCurrency } from "@/utils/currency";

const Checkout = ({ closeModal }) => {
  const { items: cartItems = [] } = useSelector((state) => state.cart);
  const { user, status } = useSelector((state) => state.auth);

  const isGuest = !user;
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    address: user?.address || '',
    phone: user?.phone || '',
    city: user?.city || '',
  });

  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [deliveryOption, setDeliveryOption] = useState('standard'); // standard, express
  const [showForm, setShowForm] = useState(isGuest || !user?.address || !user?.phone || !user?.city);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [useSavedAddress, setUseSavedAddress] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { openAuthDrawer } = useAuthDrawer();
  const currency = useSelector(selectCurrency);
  const standardShippingCost = useSelector(selectStandardShippingCost);
  const expressShippingCost = useSelector(selectExpressShippingCost);
  const freeShippingThreshold = useSelector(selectFreeShippingThreshold);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user?.name || '',
        email: user?.email || '',
        address: user?.address || '',
        phone: user?.phone || '',
        city: user?.city || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileUpdate = async () => {
    try {
      await dispatch(updateProfile(formData)).unwrap();
      toast.success('Profile updated successfully');
      setShowForm(false);
    } catch (err) {
      toast.error(err?.message || 'Failed to update profile');
    }
  };


  const handleCheckout = async () => {
    // Validate guest information
    if (isGuest) {
      const { name, email, address, phone, city } = formData;
      if (!name.trim()) {
        toast.warning('Please enter your name.');
        return;
      }
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast.warning('Please enter a valid email address.');
        return;
      }
      if (!phone.trim()) {
        toast.warning('Please enter your phone number.');
        return;
      }
      if (!address.trim()) {
        toast.warning('Please enter your shipping address.');
        return;
      }
      if (!city.trim()) {
        toast.warning('Please enter your city.');
        return;
      }
    } else {
      // Validate authenticated user address
      if (!useSavedAddress) {
        const { address, phone, city } = formData;
        if (!address.trim() || !phone.trim() || !city.trim()) {
          toast.warning('Please complete your delivery information or select a saved address.');
          return;
        }
      } else if (!selectedAddressId) {
        toast.warning('Please select a shipping address.');
        return;
      }
    }

    // For Stripe, validate configuration
    if (paymentMethod === 'STRIPE' && !stripePromise) {
      toast.error('Stripe is not configured for this project.');
      return;
    }

    const lineItems = cartItems.map((item) => {
      const unitPrice = Number(item?.product?.salePrice ?? item?.product?.price ?? 0);
      return {
        productId: item.product._id || item.product,
        name: item?.product?.title || 'Product',
        amount: unitPrice,
        quantity: item.quantity,
        image: item?.product?.picture?.secure_url || item?.product?.image || null,
      };
    });

    if (lineItems.some((item) => !Number.isFinite(item.amount) || item.amount <= 0)) {
      toast.error('One or more items have invalid pricing.');
      return;
    }

    const subtotalPrice = lineItems.reduce(
      (sum, item) => sum + item.amount * (Number(item.quantity) || 1),
      0
    );

    // Apply coupon discount if available
    const discountAmount = appliedCoupon?.discountAmount || 0;
    const shippingCost = deliveryOption === 'express'
      ? expressShippingCost
      : (subtotalPrice >= freeShippingThreshold ? 0 : standardShippingCost);
    const finalAmount = subtotalPrice - discountAmount + shippingCost;

    try {
      setLoading(true);

      // Guest checkout
      if (isGuest) {
        const guestOrderPayload = {
          products: lineItems.map((item) => ({
            id: item.productId,
            quantity: Number(item.quantity) || 1,
          })),
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          address: formData.address.trim(),
          city: formData.city.trim(),
          amount: Number(finalAmount.toFixed(2)),
          couponCode: appliedCoupon?.code || null,
          paymentMethod: paymentMethod.toUpperCase(),
          deliveryOption: deliveryOption,
          notes: '',
        };

        // For guest orders, only COD and BANK_TRANSFER are supported for now
        if (paymentMethod === 'STRIPE' || paymentMethod === 'PAYPAL') {
          toast.error('Guest checkout only supports COD and Bank Transfer. Please login for other payment methods.');
          setLoading(false);
          return;
        }

        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/pg/order/guest`,
          guestOrderPayload,
          { headers: { 'Content-Type': 'application/json' } }
        );
        
        if (response.data.success) {
          // Clear cart after successful order
          await dispatch(emptyCart()).unwrap();
          // Navigate to order confirmation page with order ID
          navigate(`/order-confirmation?orderId=${response.data.order._id}&guest=true`);
        }
      } else {
        // Authenticated user checkout
        const orderPayload = {
          products: lineItems.map((item) => ({
            id: item.productId,
            quantity: Number(item.quantity) || 1,
          })),
          amount: Number(finalAmount.toFixed(2)),
          couponCode: appliedCoupon?.code || null,
          shippingAddressId: useSavedAddress ? selectedAddressId : null,
          address: useSavedAddress ? null : formData.address,
          phone: useSavedAddress ? null : formData.phone,
          city: useSavedAddress ? null : formData.city,
          paymentMethod: paymentMethod,
          notes: '',
        };

        // Update profile if not using saved address
        if (!useSavedAddress) {
          await dispatch(updateProfile({ 
            address: formData.address, 
            phone: formData.phone, 
            city: formData.city 
          })).unwrap();
        }

        // Handle different payment methods
        if (paymentMethod === 'STRIPE') {
          localStorage.setItem('stripePendingOrder', JSON.stringify(orderPayload));

          const response = await axiosInstance.post(
            '/pg/payments/create-checkout-session',
            {
              items: lineItems,
              successUrl: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
              cancelUrl: `${window.location.origin}/cart`,
            }
          );

          const { sessionId } = response.data || {};
          if (!sessionId) {
            throw new Error('Invalid session response from server.');
          }

          const stripe = await stripePromise;
          const { error } = await stripe.redirectToCheckout({ sessionId });
          if (error) {
            throw new Error(error.message);
          }
        } else {
          // For COD or other payment methods, create order directly
          const response = await axiosInstance.post('/pg/order', orderPayload);
          
          if (response.data.success) {
            // Clear cart after successful order
            await dispatch(emptyCart()).unwrap();
            toast.success('Order placed successfully!');
            navigate('/orders');
          }
        }
      }
    } catch (err) {
      console.error(err);
      localStorage.removeItem('stripePendingOrder');
      setError(err?.response?.data?.message || err?.message || 'Something went wrong!');
      toast.error(err?.response?.data?.message || err?.message || 'Unable to complete checkout. Please try again.');
      setLoading(false);
    }
  };

  const subtotal = useMemo(
    () =>
      cartItems.reduce((sum, item) => {
        const price = Number(item?.product?.salePrice ?? item?.product?.price ?? 0);
        return sum + price * (item.quantity || 1);
      }, 0),
    [cartItems]
  );

  const discountAmount = useMemo(
    () => appliedCoupon?.discountAmount || 0,
    [appliedCoupon]
  );

  const shippingEstimate = deliveryOption === 'express'
    ? expressShippingCost
    : (subtotal >= freeShippingThreshold ? 0 : standardShippingCost);
  const total = subtotal - discountAmount + shippingEstimate;

  return (
    <>
      <SEO
        title="Secure Checkout"
        description="Complete your Ecommerce order with encrypted payment, flexible shipping, and saved address options."
        keywords={["Ecommerce checkout", "secure payment", "delivery options"]}
        noIndex
      />
      <div className="min-h-screen bg-slate-50/60 py-4 sm:py-6 md:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:gap-6 px-3 sm:px-4">
        <header className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-[0_2px_0_0_#e2e8f0]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                <ShoppingBag className="h-3.5 w-3.5" />
                Checkout
              </div>
              <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Secure Payment
              </h1>
            </div>
            <Button asChild variant="outline" className="group border-slate-200 text-slate-700 shadow-[0_2px_0_0_#e2e8f0] hover:border-slate-300 active:translate-y-[1px] active:shadow-none">
              <Link to="/cart" className="flex items-center gap-1.5 text-xs font-semibold">
                <ChevronLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-1" />
                Back to cart
              </Link>
            </Button>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Double-check your delivery details and submit your order securely.
          </p>
        </header>

        {error && (
          <Alert variant="destructive" className="border border-red-200 bg-red-50 py-2.5 rounded-xl">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-xs font-bold">Payment initialisation failed</AlertTitle>
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1.6fr_1fr] items-start">
          <section className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-[0_2px_0_0_#e2e8f0]">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm">
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Billing & Delivery</h2>
                <p className="text-[11px] text-slate-500">
                  Provide accurate details to ensure smooth delivery.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Address Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800">Shipping Address</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-slate-200 shadow-sm active:translate-y-[1px]"
                      onClick={() => setUseSavedAddress(!useSavedAddress)}
                    >
                      {useSavedAddress ? 'Use Manual Address' : 'Use Saved Address'}
                    </Button>
                  </div>
                </div>

                {useSavedAddress ? (
                  <AddressManager 
                    onSelectAddress={setSelectedAddressId}
                    selectedAddressId={selectedAddressId}
                  />
                ) : (
                  <>
                    {!showForm ? (
                      <div className="grid gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs text-slate-600">
                        <div className="flex items-center justify-between text-slate-500">
                          <span className="font-bold text-slate-800">Shipping address</span>
                          <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-emerald-600">
                            <Check className="h-3.5 w-3.5" />
                            Confirmed
                          </span>
                        </div>
                        <p>
                          <span className="font-semibold text-slate-700">Name:</span> {user?.name || "—"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-700">Contact:</span> {user?.phone || "—"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-700">Address:</span> {user?.address || "—"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-700">City:</span> {user?.city || "—"}
                        </p>
                      </div>
                    ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {/* Guest Information Fields */}
                  {isGuest && (
                    <>
                      <div className="space-y-1.5 col-span-full">
                        <label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative flex items-center rounded-xl border border-slate-200 bg-white pl-3 pr-1 shadow-sm focus-within:border-slate-800">
                          <User className="h-4 w-4 text-slate-400" />
                          <input
                            type="text"
                            name="name"
                            id="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full rounded-xl border-none bg-transparent px-2.5 py-2 text-xs sm:text-sm text-slate-800 outline-none focus:ring-0"
                            placeholder="Enter your full name"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <div className="relative flex items-center rounded-xl border border-slate-200 bg-white pl-3 pr-1 shadow-sm focus-within:border-slate-800">
                          <Mail className="h-4 w-4 text-slate-400" />
                          <input
                            type="email"
                            name="email"
                            id="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full rounded-xl border-none bg-transparent px-2.5 py-2 text-xs sm:text-sm text-slate-800 outline-none focus:ring-0"
                            placeholder="your.email@example.com"
                            required
                          />
                        </div>
                      </div>
                    </>
                  )}
                  <div className="space-y-1.5">
                    <label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Phone {isGuest && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative flex items-center rounded-xl border border-slate-200 bg-white pl-3 pr-1 shadow-sm focus-within:border-slate-800">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        name="phone"
                        id="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full rounded-xl border-none bg-transparent px-2.5 py-2 text-xs sm:text-sm text-slate-800 outline-none focus:ring-0"
                        placeholder="Contact number"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="city" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      City
                    </label>
                    <div className="relative flex items-center rounded-xl border border-slate-200 bg-white pl-3 pr-1 shadow-sm focus-within:border-slate-800">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        name="city"
                        id="city"
                        value={formData.city}
                        onChange={handleChange}
                        className="w-full rounded-xl border-none bg-transparent px-2.5 py-2 text-xs sm:text-sm text-slate-800 outline-none focus:ring-0"
                        placeholder="City or region"
                      />
                    </div>
                  </div>
                  <div className="col-span-full space-y-1.5">
                    <label htmlFor="address" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Address
                    </label>
                    <div className="relative flex items-start rounded-xl border border-slate-200 bg-white pl-3 pr-1 shadow-sm focus-within:border-slate-800">
                      <Home className="mt-2.5 h-4 w-4 text-slate-400" />
                      <textarea
                        name="address"
                        id="address"
                        rows={2}
                        value={formData.address}
                        onChange={handleChange}
                        className="w-full resize-none rounded-xl border-none bg-transparent px-2.5 py-2 text-xs sm:text-sm text-slate-800 outline-none focus:ring-0"
                        placeholder="Full delivery address"
                      />
                    </div>
                  </div>
                </div>
                  )}
                </>
                )}
              </div>

              {/* Delivery Option */}
              {isGuest && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-800">Delivery Option</Label>
                  <Select value={deliveryOption} onValueChange={setDeliveryOption}>
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 shadow-sm">
                      <SelectValue placeholder="Select delivery option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <div>
                            <div className="font-bold text-xs sm:text-sm">Standard Delivery</div>
                            <div className="text-[11px] text-slate-500">
                              {standardShippingCost > 0 ? `${formatCurrency(standardShippingCost, currency)} (` : '('}
                              Free above {formatCurrency(freeShippingThreshold, currency)}) · 3-5 business days
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="express">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4" />
                          <div>
                            <div className="font-bold text-xs sm:text-sm">Express Delivery</div>
                            <div className="text-[11px] text-slate-500">{formatCurrency(expressShippingCost, currency)} (1-2 business days)</div>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Coupon Section */}
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-3 shadow-inner">
                <CouponInput
                  orderAmount={subtotal}
                  onCouponApplied={setAppliedCoupon}
                  appliedCoupon={appliedCoupon}
                />
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-800">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 shadow-sm">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COD">
                      <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
                        <Banknote className="h-4 w-4" />
                        Cash on Delivery (COD)
                      </div>
                    </SelectItem>
                    {!isGuest && (
                      <>
                        <SelectItem value="STRIPE">
                          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
                            <CreditCard className="h-4 w-4" />
                            Credit/Debit Card (Stripe)
                          </div>
                        </SelectItem>
                        <SelectItem value="PAYPAL">
                          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
                            <Wallet className="h-4 w-4" />
                            PayPal
                          </div>
                        </SelectItem>
                      </>
                    )}
                    <SelectItem value="BANK_TRANSFER">
                      <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
                        <Building2 className="h-4 w-4" />
                        Bank Transfer
                      </div>
                    </SelectItem>
                    <SelectItem value="EASYPAISA">
                      <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
                        <Building2 className="h-4 w-4" />
                        Easypaisa
                      </div>
                    </SelectItem>
                    <SelectItem value="JAZZCASH">
                      <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
                        <Building2 className="h-4 w-4" />
                        JazzCash
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-500">
                  {paymentMethod === 'COD' && 'Pay cash when your order arrives at your doorstep'}
                  {paymentMethod === 'STRIPE' && 'Secure payment via credit/debit card (Stripe)'}
                  {paymentMethod === 'PAYPAL' && 'Pay securely with your PayPal account'}
                  {paymentMethod === 'BANK_TRANSFER' && 'Direct wire transfer to our company bank account'}
                  {paymentMethod === 'EASYPAISA' && 'Pay using Easypaisa wallet'}
                  {paymentMethod === 'JAZZCASH' && 'Pay using JazzCash wallet'}
                  {isGuest && paymentMethod !== 'COD' && paymentMethod !== 'BANK_TRANSFER' && 'Note: Guest checkout only supports COD and Bank Transfer'}
                </p>
                {isGuest && (paymentMethod === 'STRIPE' || paymentMethod === 'PAYPAL') && (
                  <Alert className="bg-amber-50 border-amber-200 py-2 rounded-xl">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-xs text-amber-800">
                      Guest checkout only supports COD and Bank Transfer. Please{" "}
                      <button
                        type="button"
                        onClick={() => openAuthDrawer('login', { redirectTo: '/checkout' })}
                        className="underline font-bold text-slate-900"
                      >
                        login
                      </button>{" "}
                      to use other payment options.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="flex flex-col gap-2.5 sm:flex-row pt-2">
                {isGuest ? (
                  <Button
                    onClick={handleCheckout}
                    disabled={loading || cartItems.length === 0}
                    className="w-full bg-slate-900 text-white font-bold shadow-[0_3px_0_0_#020617] hover:bg-slate-800 active:translate-y-[2px] active:shadow-none"
                  >
                    {loading ? (
                      <OneLoader size="small" text="Processing..." showText={false} />
                    ) : (
                      <>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Complete Guest Checkout
                      </>
                    )}
                  </Button>
                ) : showForm ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setShowForm(false)}
                      className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm active:translate-y-[1px]"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleProfileUpdate}
                      disabled={status === "loading"}
                      className="flex-1 bg-slate-900 text-white font-bold shadow-[0_3px_0_0_#020617] hover:bg-slate-800 active:translate-y-[2px] active:shadow-none"
                    >
                      {status === "loading" ? (
                        <OneLoader size="small" text="Saving..." showText={false} />
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Save details
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setShowForm(true)}
                      className="flex-1 border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm active:translate-y-[1px]"
                    >
                      <Edit className="mr-1.5 h-3.5 w-3.5" />
                      Edit info
                    </Button>
                    <Button
                      onClick={handleCheckout}
                      disabled={loading || cartItems.length === 0}
                      className="flex-1 bg-slate-900 text-white font-bold shadow-[0_3px_0_0_#020617] hover:bg-slate-800 active:translate-y-[2px] active:shadow-none"
                    >
                      {loading ? (
                        <OneLoader size="small" text="Processing..." showText={false} />
                      ) : (
                        <>
                          {paymentMethod === 'COD' ? (
                            <>
                              <Banknote className="mr-2 h-4 w-4" />
                              Place Order (COD)
                            </>
                          ) : paymentMethod === 'STRIPE' ? (
                            <>
                              <CreditCard className="mr-2 h-4 w-4" />
                              Pay with Card
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="mr-2 h-4 w-4" />
                              Complete Order
                            </>
                          )}
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-[11px] text-slate-500">
                By placing your order, you agree to our{" "}
                <a href="#" className="font-semibold text-slate-900 underline-offset-4 hover:underline">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="font-semibold text-slate-900 underline-offset-4 hover:underline">
                  Privacy Policy
                </a>
                .
              </div>
            </div>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-20">
            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_2px_0_0_#e2e8f0]">
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                <h2 className="text-sm sm:text-base font-bold text-slate-900">Order Summary</h2>
                <p className="text-[11px] text-slate-500">
                  Review items before finalizing payment.
                </p>
              </div>

              {cartItems.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-slate-500">
                  Your bag is empty.{" "}
                  <Link to="/products" className="font-bold text-slate-900 underline-offset-4 hover:underline">
                    Continue shopping
                  </Link>
                  .
                </div>
              ) : (
                <>
                  <ul className="divide-y divide-slate-100 px-4 max-h-[320px] overflow-y-auto">
                    {cartItems.map((item) => {
                      const product = item.product || {};
                      const unitPrice = Number(product?.salePrice ?? product?.price ?? 0);

                      return (
                        <li key={product._id || product?.id} className="flex gap-3 py-3 items-center">
                          <CartImage
                            src={product.picture?.secure_url || product.image}
                            alt={product.title}
                            className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 object-cover bg-slate-50"
                            fallback="/logo.svg"
                            quality={70}
                          />
                          <div className="flex flex-1 flex-col justify-between text-xs text-slate-600">
                            <div>
                              <p className="font-semibold text-slate-900 line-clamp-1">{product.title || "Product"}</p>
                              <p className="text-[11px] text-slate-400">
                                Qty {item.quantity} • {formatCurrency(unitPrice, currency)}
                              </p>
                            </div>
                            <p className="text-xs font-bold text-slate-900 mt-0.5">
                              {formatCurrency(unitPrice * (item.quantity || 1), currency)}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="space-y-2.5 border-t border-slate-100 px-4 py-4 text-xs sm:text-sm text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Subtotal</span>
                      <span className="font-bold text-slate-900">{formatCurrency(subtotal, currency)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex items-center justify-between text-emerald-600 font-semibold">
                        <span>Discount ({appliedCoupon?.code})</span>
                        <span>-{formatCurrency(discountAmount, currency)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span>Shipping {isGuest && deliveryOption === 'express' && '(Express)'}</span>
                      <span className={shippingEstimate === 0 ? "text-emerald-600 font-bold" : "text-slate-500"}>
                        {shippingEstimate === 0
                          ? `Free${deliveryOption === 'express' ? '' : ` (orders ${formatCurrency(freeShippingThreshold, currency)}+)`}`
                          : formatCurrency(shippingEstimate, currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Taxes</span>
                      <span className="text-slate-400">Included</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200 pt-2.5 text-sm sm:text-base font-black text-slate-900">
                      <span>Total</span>
                      <span>{formatCurrency(total, currency)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
              <Shield className="h-4 w-4 text-emerald-600 shrink-0" />
              <div className="text-[11px] leading-tight">
                Secure SSL encryption. We never store your payment card details.
              </div>
            </div>
          </aside>
        </div>
      </div>
      </div>
    </>
  );
};

export default Checkout;
