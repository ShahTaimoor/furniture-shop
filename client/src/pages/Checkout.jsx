import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { addOrder } from '@/redux/slices/order/orderSlice';
import { emptyCart } from '@/redux/slices/cart/cartSlice';
import { updateProfile } from '@/redux/slices/auth/authSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import OneLoader from '@/components/ui/OneLoader';
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
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const Checkout = ({ closeModal }) => {
  const { items: cartItems = [] } = useSelector((state) => state.cart);
  const { user, status } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    address: user?.address || '',
    phone: user?.phone || '',
    city: user?.city || '',
  });

  const [showForm, setShowForm] = useState(!user?.address || !user?.phone || !user?.city);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    setFormData({
      address: user?.address || '',
      phone: user?.phone || '',
      city: user?.city || '',
    });
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
    const { address, phone, city } = formData;
    if (!address.trim() || !phone.trim() || !city.trim()) {
      return toast('Please fill out all fields');
    }

    const totalPrice = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

    const productArray = cartItems.map((item) => ({
      id: item.product._id || item.product,
      quantity: item.quantity,
    }));

    try {
      setLoading(true);
      await dispatch(updateProfile({ address, phone, city })).unwrap();

      const orderData = {
        products: productArray,
        amount: totalPrice.toFixed(2),
        address,
        phone,
        city,
      };

      const res = await dispatch(addOrder(orderData)).unwrap();

      if (res.success) {
        dispatch(emptyCart());
        closeModal && closeModal();
        
        // Navigate to success page
        navigate('/success');
        toast.success('Order placed successfully!');
      } else {
        toast.error('Failed to place order');
      }
    } catch (err) {
      setError(err?.message || 'Something went wrong!');
      toast.error('Something went wrong!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-b from-gray-50 to-white ">
      {/* Fixed Billing Information Card at Bottom */}
      <div className=" bg-white pt-3 border-t border-gray-200 shadow-lg z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="relative p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden rounded-2xl">
              <div className="absolute -top-5 -left-5 w-32 h-32 bg-teal-100 rounded-full filter blur-3xl opacity-20"></div>
            </div>

            <div className="relative z-10">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-teal-600" />
                Billing Information
              </h2>

              <div className="space-y-6">
                {!showForm ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-700">Shipping Address</h3>
                        <Check className="w-4 h-4 text-green-500" />
                      </div>
                      <p className="text-sm text-gray-600"><span>Shop Name: </span>{user?.name}</p>
                      <p className="text-sm text-gray-600"><span>Contact No: </span>{user?.phone}</p>
                      <p className="text-sm text-gray-600"><span>Address: </span>{user?.address}</p>
                      <p className="text-sm text-gray-600"><span>City: </span>{user?.city}</p>
                  
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Phone */}
                    <div className="relative w-full">
                      <input
                        type="text"
                        name="phone"
                        id="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder=" "
                        required
                        className="peer w-full border border-gray-300 rounded-md pb-2 px-3 pt-3 text-sm bg-white 
        focus:outline-none focus:ring-2 focus:ring-[#FED700] focus:border-[#FED700]"
                      />
                      <label
                        htmlFor="phone"
                        className="absolute left-2.5 -top-2.5 bg-white px-1 text-xs text-[#FED700] 
        transition-all duration-200 ease-in-out pointer-events-none
        peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 
        peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-[#FED700] flex items-center gap-1"
                      >
                        <Phone className="w-4 h-4" /> Phone
                      </label>
                    </div>
                    {/* City */}
                    <div className="relative w-full">
                      <input
                        type="text"
                        name="city"
                        id="city"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder=" "
                        required
                        className="peer w-full border border-gray-300 rounded-md pb-2 px-3 pt-3 text-sm bg-white 
        focus:outline-none focus:ring-2 focus:ring-[#FED700] focus:border-[#FED700]"
                      />
                      <label
                        htmlFor="city"
                        className="absolute left-2.5 -top-2.5 bg-white px-1 text-xs text-[#FED700] 
        transition-all duration-200 ease-in-out pointer-events-none
        peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 
        peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-[#FED700] flex items-center gap-1"
                      >
                        <MapPin className="w-4 h-4" /> City
                      </label>
                    </div>
                  </div>
                )}

                {/* Address - Full Width */}
                {showForm && (
                  <div className="relative w-full">
                    <textarea
                      name="address"
                      id="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder=" "
                      rows={3}
                      required
                      className="peer w-full border border-gray-300 rounded-md pb-2 px-3 pt-3 text-sm bg-white 
        focus:outline-none focus:ring-2 focus:ring-[#FED700] focus:border-[#FED700]"
                    />
                    <label
                      htmlFor="address"
                      className="absolute left-2.5 -top-2.5 bg-white px-1 text-xs text-[#FED700] 
        transition-all duration-200 ease-in-out pointer-events-none
        peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 
        peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-[#FED700] flex items-center gap-1"
                    >
                      <Home className="w-4 h-4" /> Address
                    </label>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  {showForm ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setShowForm(false)}
                        className="flex-1 border-gray-300 hover:bg-gray-50"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleProfileUpdate}
                        disabled={status === 'loading'}
                        className="flex-1 bg-black text-white"
                      >
                        {status === 'loading' ? (
                          <OneLoader size="small" text="Saving..." showText={false} />
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            Save Info
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setShowForm(true)}
                        className="flex-1 border-gray-300 hover:bg-gray-50 flex items-center justify-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit Profile Info
                      </Button>
                      <Button
                        onClick={handleCheckout}
                        disabled={loading}
                        className="flex-1 bg-black text-white flex items-center gap-2"
                      >
                        {loading ? (
                          <OneLoader size="small" text="Processing..." showText={false} />
                        ) : (
                          <>
                            <ShoppingCart className="w-5 h-5" />
                            Place Order
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>

                <div className="text-xs text-gray-500 text-center pt-2">
                  By placing your order, you agree to our{' '}
                  <a href="#" className="text-blue-600 hover:underline">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-blue-600 hover:underline">
                    Privacy Policy
                  </a>
                  .
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
