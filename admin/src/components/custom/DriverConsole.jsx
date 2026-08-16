import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import useSocket from '../../hooks/useSocket';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const STATUSES = ['pending', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered'];

const DriverConsole = () => {
  const socket = useSocket();
  const [orderId, setOrderId] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('confirmed');
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const locationRef = useRef({ lat: null, lng: null });

  const canSend = Boolean(orderId?.trim());

  const persistEvent = (message, meta = {}) => {
    setLastEvent({
      message,
      meta,
      at: new Date().toISOString(),
    });
  };

  const emitOrderStatus = useCallback(
    (status) => {
      if (!canSend) {
        toast.error('Provide an order ID first');
        return;
      }
      socket.emit('updateOrderStatus', { orderId: orderId.trim(), status }, (response) => {
        if (response?.success) {
          toast.success(`Status updated to ${status}`);
          persistEvent(`Status set to ${status}`, response.data);
        } else {
          toast.error(response?.message || 'Unable to update status');
          persistEvent('Status update failed', { status, error: response?.message });
        }
      });
    },
    [socket, orderId, canSend]
  );

  const emitLocation = useCallback(
    ({ lat: nextLat, lng: nextLng, silent = false } = {}) => {
      if (!canSend) {
        if (!silent) toast.error('Provide an order ID first');
        return;
      }

      const latitude = Number(nextLat ?? lat);
      const longitude = Number(nextLng ?? lng);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        if (!silent) toast.error('Provide valid latitude and longitude');
        return;
      }

      socket.emit(
        'updateDriverLocation',
        { orderId: orderId.trim(), lat: latitude, lng: longitude },
        (response) => {
          if (response?.success) {
            if (!silent) toast.success('Location pushed to customers');
            persistEvent('Driver location updated', {
              lat: latitude,
              lng: longitude,
              status: response?.data?.status,
            });
          } else if (!silent) {
            toast.error(response?.message || 'Unable to update location');
            persistEvent('Location update failed', { error: response?.message });
          }
        }
      );
    },
    [socket, orderId, lat, lng, canSend]
  );

  useEffect(() => {
    if (!isStreaming) return undefined;
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported in this browser');
      setIsStreaming(false);
      return undefined;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        };
        setLat(String(coords.lat));
        setLng(String(coords.lng));
        locationRef.current = coords;
      },
      (error) => {
        toast.error(error.message || 'Unable to read current location');
        setIsStreaming(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isStreaming]);

  useEffect(() => {
    if (!isStreaming) return undefined;

    const interval = setInterval(() => {
      if (!locationRef.current.lat || !locationRef.current.lng) return;
      emitLocation({ lat: locationRef.current.lat, lng: locationRef.current.lng, silent: true });
    }, 4000);

    return () => clearInterval(interval);
  }, [emitLocation, isStreaming]);

  useEffect(() => {
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket]);

  const connectionLabel = useMemo(() => (isConnected ? 'Connected' : 'Connecting...'), [isConnected]);

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-slate-600">Socket status</p>
          <p className={`text-lg font-semibold ${isConnected ? 'text-emerald-600' : 'text-amber-500'}`}>
            {connectionLabel}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <Label htmlFor="orderId">Order ID</Label>
            <Input
              id="orderId"
              placeholder="64f5..."
              value={orderId}
              onChange={(event) => setOrderId(event.target.value)}
            />
            <p className="text-sm text-slate-500">
              Customers join rooms keyed by this order ID. Make sure it matches exactly.
            </p>
          </div>

          <div className="space-y-4">
            <Label>Order status</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button disabled={!canSend} onClick={() => emitOrderStatus(selectedStatus)}>
              Update Status
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="lat">Latitude</Label>
            <Input
              id="lat"
              type="number"
              step="0.000001"
              value={lat ?? ''}
              onChange={(event) => setLat(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lng">Longitude</Label>
            <Input
              id="lng"
              type="number"
              step="0.000001"
              value={lng ?? ''}
              onChange={(event) => setLng(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => emitLocation()}>
            Push Location Update
          </Button>
          <Button variant={isStreaming ? 'destructive' : 'default'} onClick={() => setIsStreaming((prev) => !prev)}>
            {isStreaming ? 'Stop Live Tracking' : 'Start Live Tracking'}
          </Button>
        </div>
        <p className="text-sm text-slate-500">
          Live tracking sends coordinates every 4 seconds. Manual push is always available for fine control.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-800">Event log</h3>
        {lastEvent ? (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-slate-700">{lastEvent.message}</p>
            <p className="text-xs text-slate-500">At {new Date(lastEvent.at).toLocaleString()}</p>
            {lastEvent.meta ? (
              <pre className="rounded bg-slate-50 p-3 text-xs text-slate-600 overflow-x-auto">
                {JSON.stringify(lastEvent.meta, null, 2)}
              </pre>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No events yet.</p>
        )}
      </div>
    </div>
  );
};

export default DriverConsole;

