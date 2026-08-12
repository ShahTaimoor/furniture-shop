import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { CheckCircle, Home, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import axiosInstance from '@/redux/slices/auth/axiosInstance';
import { addOrder } from '@/redux/slices/order/orderSlice';
import { emptyCart } from '@/redux/slices/cart/cartSlice';
import SEO from '@/components/seo/SEO';

const Success = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const [countdown, setCountdown] = useState(5);
  const [processingState, setProcessingState] = useState('idle'); // idle | processing | success | error
  const [errorMessage, setErrorMessage] = useState('');

  const sessionId = useMemo(
    () => new URLSearchParams(location.search).get('session_id'),
    [location.search]
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (countdown === 0) {
      navigate('/');
    }
  }, [countdown, navigate]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    const finalizeOrder = async () => {
      try {
        setProcessingState('processing');

        const { data } = await axiosInstance.post('/payments/confirm', { sessionId });

        if (!data?.success) {
          throw new Error(data?.message || 'Unable to verify payment.');
        }

        if (data.paymentStatus !== 'paid') {
          throw new Error('Payment has not been completed yet. Please contact support.');
        }

        if (data.alreadyProcessed) {
          localStorage.removeItem('stripePendingOrder');
          await dispatch(emptyCart());
          setProcessingState('success');
          toast.success('Payment confirmed. Thank you!');
          return;
        }

        const pendingOrderRaw = localStorage.getItem('stripePendingOrder');
        if (!pendingOrderRaw) {
          throw new Error('We could not locate your order details after payment. Please contact support with your payment confirmation.');
        }

        const pendingOrder = JSON.parse(pendingOrderRaw);
        
        // Validate order data before creating order
        if (!pendingOrder.products || !Array.isArray(pendingOrder.products) || pendingOrder.products.length === 0) {
          throw new Error('Invalid order data: No products found in order.');
        }

        // Ensure payment method is set correctly
        const orderPayload = {
          ...pendingOrder,
          paymentMethod: pendingOrder.paymentMethod || 'CARD',
          paymentStatus: 'paid',
          metadata: { 
            ...(pendingOrder.metadata || {}),
            stripeSessionId: sessionId 
          },
        };

        // Note: Backend will use user's saved address if shippingAddressId is provided
        // If no address is in payload, backend should use user's profile address
        // Backend handles this in orderRoutes.js line 402-406

        const orderResponse = await dispatch(
          addOrder(orderPayload)
        ).unwrap();

        // Cart is automatically cleared by backend after order creation
        // Also clear from frontend state for immediate UI update
        try {
          await dispatch(emptyCart()).unwrap();
        } catch (cartError) {
          console.warn('Frontend cart clearing failed (backend already cleared):', cartError);
          // Cart already cleared by backend, continue
        }

        if (orderResponse?.data?._id) {
          try {
            await axiosInstance.post('/payments/mark-complete', {
              sessionId,
              orderId: orderResponse.data._id,
            });
          } catch (markError) {
            console.warn('Stripe mark-complete failed:', markError);
          }
        }

        localStorage.removeItem('stripePendingOrder');
        setProcessingState('success');
        toast.success('Payment confirmed and order created.');
      } catch (error) {
        console.error('Order finalization error:', error);
        
        // Extract meaningful error message
        let errorMsg = 'We were unable to finalise your payment.';
        
        if (error?.response?.data?.message) {
          errorMsg = error.response.data.message;
        } else if (error?.message) {
          errorMsg = error.message;
        } else if (typeof error === 'string') {
          errorMsg = error;
        } else if (error?.payload) {
          // Redux thunk rejected value
          errorMsg = typeof error.payload === 'string' 
            ? error.payload 
            : error.payload?.message || 'Order creation failed';
        }

        // Check for common errors
        if (errorMsg.includes('address') || errorMsg.includes('shipping')) {
          errorMsg = 'Shipping address is required. Please contact support to update your order.';
        } else if (errorMsg.includes('stock') || errorMsg.includes('out of stock')) {
          errorMsg = 'One or more items are no longer available. Your payment was successful, but we need to update your order. Please contact support.';
        } else if (errorMsg.includes('Product not found')) {
          errorMsg = 'Some items are no longer available. Your payment was successful, but we need to update your order. Please contact support.';
        }

        setErrorMessage(errorMsg);
        setProcessingState('error');
        
        // Log full error for debugging
        console.error('Full error details:', {
          message: errorMsg,
          error: error,
          response: error?.response?.data,
          payload: error?.payload,
        });
      }
    };

    finalizeOrder();
  }, [dispatch, sessionId]);

  const seoElement = (
    <SEO
      title="Payment Success"
      description="Your Ecommerce payment is confirmed. Review the final status while we redirect you back to the store."
      keywords={['payment success', 'stripe confirmation', 'Ecommerce order']}
      noIndex
    />
  );

  const renderStatus = () => {
    if (!sessionId) {
      return (
        <p className="text-gray-600 mb-6">
          Thank you for your purchase. Your order has been placed successfully.
        </p>
      );
    }

    if (processingState === 'processing') {
      return (
        <div className="flex flex-col items-center gap-3 mb-6">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
          <p className="text-sm text-gray-500">Confirming your payment with Stripe…</p>
        </div>
      );
    }

    if (processingState === 'error') {
      return (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-left">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <p className="font-semibold">We hit a snag completing your order.</p>
          </div>
          <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
          <p className="mt-2 text-sm text-slate-600">
            Your card has not been charged. Please try again or contact support.
          </p>
        </div>
      );
    }

    return (
      <p className="text-gray-600 mb-6">
        Thank you for your purchase. Your order has been placed successfully.
      </p>
    );
  };

  return (
    <>
      {seoElement}
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
            {processingState === 'error' ? (
              <AlertTriangle className="w-12 h-12 text-red-500" />
            ) : (
              <CheckCircle className="w-12 h-12 text-green-600" />
            )}
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {processingState === 'error' ? 'We could not finish your order' : 'Order Successful!'}
        </h1>

        {renderStatus()}

        <div className="mb-8">
          <div className="text-sm text-gray-500 mb-2">Redirecting to the homepage in:</div>
          <div className="text-2xl font-bold text-green-600">{countdown} seconds</div>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors duration-200"
        >
          <Home className="w-4 h-4" />
          Go to Homepage Now
        </Link>

        <div className="mt-6">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${((5 - countdown) / 5) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default Success;
