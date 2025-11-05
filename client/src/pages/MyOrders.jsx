import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import OneLoader from '@/components/ui/OneLoader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import OrderData from '@/components/custom/OrderData';
import { fetchOrders, deleteOrder } from '@/redux/slices/order/orderSlice';
import { toast } from 'sonner';

// Helper to get today date in 'yyyy-mm-dd' format for Pakistan timezone
const getPakistaniDate = () => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
};

const MyOrders = () => {
  const dispatch = useDispatch();

  const { orders, status, error } = useSelector((state) => state.orders);
  const { user } = useSelector((state) => state.auth);

  const [selectedDate, setSelectedDate] = useState(getPakistaniDate);

  useEffect(() => {
    dispatch(fetchOrders());
  }, [dispatch]);

  const handleDeleteOrder = async (orderId) => {
    try {
      await dispatch(deleteOrder(orderId)).unwrap();
      toast.success('Order deleted successfully and stock restored');
    } catch (error) {
      toast.error(error?.message || 'Failed to delete order');
    }
  };

  // Filter orders by selected date based on Pakistan timezone
  const filteredOrders = orders.filter(order => {
    const orderDate = new Date(order.createdAt)
      .toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
    return orderDate === selectedDate;
  });

  if (status === 'loading') {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <OneLoader size="xl" text="Loading Orders..." />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 lg:py-16">
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 sm:mb-6">My Orders</h1>

      {/* Date picker */}
      <div className="mb-4 sm:mb-6">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full sm:w-auto p-2 sm:p-3 border border-gray-300 rounded-md text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          max={getPakistaniDate()} // restrict max date to today in Pakistan timezone
        />
      </div>

      {status === 'failed' ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || 'Something went wrong fetching your orders.'}</AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {filteredOrders.length === 0 ? (
            <p className="text-gray-500 text-sm sm:text-base text-center py-8">No orders found for {selectedDate}.</p>
          ) : (
            filteredOrders.map((order) => (
              <div key={order._id} className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <OrderData {...order} user={user} onDelete={handleDeleteOrder} />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MyOrders;
