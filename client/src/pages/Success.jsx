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
          throw new Error('We could not locate your order details after payment.');
        }

        const pendingOrder = JSON.parse(pendingOrderRaw);
        const orderResponse = await dispatch(
          addOrder({
            ...pendingOrder,
            paymentMethod: 'CARD',
            paymentStatus: 'paid',
            metadata: { stripeSessionId: sessionId },
          })
        ).unwrap();

        await dispatch(emptyCart());

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
        console.error(error);
        setErrorMessage(error?.message || 'We were unable to finalise your payment.');
        setProcessingState('error');
      }
    };

    finalizeOrder();
  }, [dispatch, sessionId]);

  const seoElement = (
    <SEO
      title="Payment Success"
      description="Your HELLAS payment is confirmed. Review the final status while we redirect you back to the store."
      keywords={['payment success', 'stripe confirmation', 'HELLAS order']}
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
