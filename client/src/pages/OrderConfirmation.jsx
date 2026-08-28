import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, Package, Mail, Phone, MapPin, Clock, AlertCircle, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import axios from "axios";
import OneLoader from "@/components/ui/OneLoader";
import { useAuthDrawer } from "@/contexts/AuthDrawerContext";
import SEO from "@/components/seo/SEO";
import { selectCurrency } from "@/redux/slices/settings/settingsSlice";
import { formatCurrency } from "@/utils/currency";

const OrderConfirmation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { openAuthDrawer } = useAuthDrawer();
  const currency = useSelector(selectCurrency);
  const orderId = searchParams.get("orderId");
  const isGuest = searchParams.get("guest") === "true";

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setError("Order ID is missing");
        setLoading(false);
        return;
      }

      try {
        // For guest orders, we need to create a public endpoint
        // For now, we'll just show the order ID from the URL
        setOrder({
          _id: orderId,
          isGuest: isGuest,
          // In production, you would fetch order details from backend
        });
        setLoading(false);
      } catch (err) {
        console.error("Error fetching order:", err);
        setError("Failed to load order details");
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, isGuest]);

  const seoElement = (
    <SEO
      title={orderId ? `Order Confirmation #${orderId}` : "Order Confirmation"}
      description="View your Ecommerce order confirmation, key delivery information, and recommended next steps."
      keywords={["order confirmation", "Ecommerce order", "delivery status"]}
      noIndex
    />
  );

  if (loading) {
    return (
      <>
        {seoElement}
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <OneLoader size="large" text="Loading order details..." />
        </div>
      </>
    );
  }

  if (error || !order) {
    return (
      <>
        {seoElement}
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
            <p className="text-gray-600 mb-6">{error || "Unable to find order details"}</p>
            <div className="flex gap-4 justify-center">
              <Button asChild variant="outline">
                <Link to="/">Continue Shopping</Link>
              </Button>
              {isGuest && (
                <Button onClick={() => openAuthDrawer('signup', { redirectTo: '/orders' })}>
                  Create Account
                </Button>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {seoElement}
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
          <p className="text-gray-600">
            Thank you for your order. {isGuest && "We've sent a confirmation email to your email address."}
          </p>
        </div>

        {/* Order Details Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b">
            <Package className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Order Details</h2>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Order Number</span>
              <span className="font-semibold text-gray-900">#{order._id}</span>
            </div>

            {isGuest && order.guestInfo && (
              <>
                <div className="flex items-start gap-3 pt-4 border-t">
                  <User className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{order.guestInfo.name}</p>
                    <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                      <Mail className="h-3 w-3" />
                      {order.guestInfo.email}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                      <Phone className="h-3 w-3" />
                      {order.guestInfo.phone}
                    </p>
                  </div>
                </div>
              </>
            )}

            <div className="flex items-start gap-3 pt-4 border-t">
              <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">Shipping Address</p>
                <p className="text-sm text-gray-600 mt-1">
                  {order.address || "Not specified"}
                  {order.city && `, ${order.city}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t">
              <Clock className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">Expected Delivery</p>
                <p className="text-sm text-gray-600 mt-1">
                  {order.metadata?.deliveryOption === 'express' 
                    ? '1-2 business days (Express Delivery)'
                    : '3-5 business days (Standard Delivery)'}
                </p>
              </div>
            </div>

            {order.amount && (
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Total Amount</span>
                  <span className="text-xl font-bold text-gray-900">{formatCurrency(order.amount, currency)}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between items-center text-green-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(order.discountAmount, currency)}</span>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Payment Method: </span>
                {order.paymentMethod === 'COD' && 'Cash on Delivery'}
                {order.paymentMethod === 'BANK_TRANSFER' && 'Bank Transfer'}
                {order.paymentMethod === 'EASYPAISA' && 'Easypaisa'}
                {order.paymentMethod === 'JAZZCASH' && 'JazzCash'}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-medium">Status: </span>
                <span className="text-blue-600 font-medium">{order.status || 'Pending'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Info Alert */}
        {isGuest && (
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              A confirmation email has been sent to your email address. Please check your inbox for order updates.
              {order.guestInfo?.email && ` (${order.guestInfo.email})`}
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button asChild className="flex-1">
            <Link to="/">Continue Shopping</Link>
          </Button>
          {isGuest && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => openAuthDrawer('signup', { redirectTo: '/orders' })}
            >
              Create Account to Track Orders
            </Button>
          )}
          {!isGuest && (
            <Button asChild variant="outline" className="flex-1">
              <Link to="/orders">View My Orders</Link>
            </Button>
          )}
        </div>

        {/* Guest Account Suggestion */}
        {isGuest && (
          <div className="mt-8 p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-sm text-gray-600 mb-2">
              Want to track your orders easily?
            </p>
            <Button
              variant="link"
              className="text-blue-600"
              onClick={() => openAuthDrawer('signup', { redirectTo: '/orders' })}
            >
              Create a free account →
            </Button>
          </div>
        )}
      </div>
      </div>
    </>
  );
};

export default OrderConfirmation;

