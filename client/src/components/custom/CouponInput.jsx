import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import axiosInstance from '@/redux/slices/auth/axiosInstance';
import { Tag, X, Check } from 'lucide-react';
import OneLoader from '@/components/ui/OneLoader';

const CouponInput = ({ orderAmount, onCouponApplied, appliedCoupon = null }) => {
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }

    try {
      setValidating(true);
      const response = await axiosInstance.post('/coupons/validate', {
        code: couponCode.trim(),
        orderAmount: orderAmount
      });

      if (response.data.success && response.data.coupon) {
        const coupon = response.data.coupon;
        toast.success(`Coupon "${coupon.code}" applied successfully!`);
        setCouponCode('');
        if (onCouponApplied) {
          onCouponApplied(coupon);
        }
      }
    } catch (error) {
      console.error('Error applying coupon:', error);
      const message = error?.response?.data?.message || 'Invalid or expired coupon code';
      toast.error(message);
    } finally {
      setValidating(false);
    }
  };

  const handleRemoveCoupon = () => {
    if (onCouponApplied) {
      onCouponApplied(null);
    }
    toast.info('Coupon removed');
  };

  if (appliedCoupon) {
    return (
      <div className="space-y-2">
        <Label>Coupon Code</Label>
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <Tag className="h-4 w-4 text-emerald-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-emerald-900">{appliedCoupon.code}</p>
            <p className="text-xs text-emerald-700">
              {appliedCoupon.discountType === 'percentage'
                ? `${appliedCoupon.discountValue}% off`
                : `PKR ${appliedCoupon.discountValue} off`}
              {' '}- {appliedCoupon.name}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemoveCoupon}
            className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Discount Applied:</span>
          <span className="font-semibold text-emerald-600">
            -PKR {appliedCoupon.discountAmount?.toFixed(2) || '0.00'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="couponCode">Coupon Code</Label>
      <form onSubmit={handleApplyCoupon} className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="couponCode"
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            placeholder="Enter coupon code"
            className="pl-9"
            disabled={validating || loading}
          />
        </div>
        <Button
          type="submit"
          variant="outline"
          disabled={validating || loading || !couponCode.trim()}
          className="shrink-0"
        >
          {validating ? (
            <OneLoader size="small" showText={false} />
          ) : (
            'Apply'
          )}
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">
        Enter your coupon code to apply discount
      </p>
    </div>
  );
};

export default CouponInput;

