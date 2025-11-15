import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import useSocket from './useSocket';
import { mergeTrackingSnapshot, updateDriverLocationLive } from '../redux/slices/orderTracking/orderTrackingSlice';

const useOrderTrackingSocket = (orderId) => {
  const socket = useSocket();
  const dispatch = useDispatch();

  useEffect(() => {
    if (!orderId) return;

    socket.emit('joinOrderRoom', { orderId });

    const handleStatusUpdate = (payload) => {
      if (!payload || payload.orderId !== orderId) return;
      dispatch(mergeTrackingSnapshot(payload));
    };

    const handleDriverLocation = (payload) => {
      if (!payload || payload.orderId !== orderId) return;
      dispatch(updateDriverLocationLive(payload.location));
    };

    socket.on('orderStatusUpdated', handleStatusUpdate);
    socket.on('driverLocationUpdated', handleDriverLocation);

    return () => {
      socket.emit('leaveOrderRoom', { orderId });
      socket.off('orderStatusUpdated', handleStatusUpdate);
      socket.off('driverLocationUpdated', handleDriverLocation);
    };
  }, [socket, orderId, dispatch]);
};

export default useOrderTrackingSocket;

