import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import OneLoader from '../components/ui/OneLoader';
import useOrderTrackingSocket from '../hooks/useOrderTrackingSocket';
import {
  fetchOrderTracking,
  resetOrderTracking,
} from '../redux/slices/orderTracking/orderTrackingSlice';

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

const AnimatedMarker = ({ location }) => {
  const [currentPosition, setCurrentPosition] = useState(location);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!location?.lat || !location?.lng) return;

    const start = currentPosition?.lat ? currentPosition : location;
    const startTime = performance.now();
    const duration = 1000;

    const step = (timestamp) => {
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const lat = start.lat + (location.lat - start.lat) * progress;
      const lng = start.lng + (location.lng - start.lng) * progress;
      setCurrentPosition({ lat, lng });
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [location?.lat, location?.lng]);

  if (!currentPosition?.lat || !currentPosition?.lng) return null;
  return <Marker position={[currentPosition.lat, currentPosition.lng]} />;
};

const formatStatus = (status) => status?.replace(/_/g, ' ') ?? 'pending';

const TrackOrderPage = () => {
  const { orderId } = useParams();
  const dispatch = useDispatch();
  const tracking = useSelector((state) => state.orderTracking);
  const { loading, error, status, history, timelineStatuses, location, lastUpdated, trackingNumber, amount, customer } =
    tracking;

  useEffect(() => {
    if (orderId) {
      dispatch(fetchOrderTracking(orderId));
    }
    return () => {
      dispatch(resetOrderTracking());
    };
  }, [dispatch, orderId]);

  useOrderTrackingSocket(orderId);

  const timeline = useMemo(() => {
    const map = new Map();
    history?.forEach((entry) => {
      if (!map.has(entry.status)) {
        map.set(entry.status, entry.changedAt);
      }
    });

    const fallback = Array.from(map.keys());
    const source = timelineStatuses?.length ? timelineStatuses : fallback.length ? fallback : status ? [status] : [];
    const currentIndex = source.findIndex((item) => item === status);

    return source.map((statusKey, index) => ({
      status: statusKey,
      changedAt: map.get(statusKey),
      completed: currentIndex >= 0 ? index <= currentIndex : map.has(statusKey),
    }));
  }, [history, timelineStatuses, status]);

  const hasLocation = Number.isFinite(location?.lat) && Number.isFinite(location?.lng);
  const center = hasLocation ? [location.lat, location.lng] : [24.8607, 67.0011]; // Karachi fallback

  const renderStatusTimeline = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900">Live order status</h3>
      <div className="space-y-3">
        {timeline.map((item) => (
          <div key={item.status} className="flex items-center gap-4">
            <div
              className={`h-4 w-4 rounded-full border-2 ${
                item.completed ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
              }`}
            />
            <div>
              <p className="text-sm font-medium text-slate-800">{formatStatus(item.status)}</p>
              {item.changedAt ? (
                <p className="text-xs text-slate-500">{new Date(item.changedAt).toLocaleString()}</p>
              ) : (
                <p className="text-xs text-slate-400">Waiting for update</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <OneLoader size="large" text="Fetching live tracking..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-center text-sm text-red-500">{error}</p>
        <div className="text-center">
          <Button onClick={() => dispatch(fetchOrderTracking(orderId))}>Try again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-900">Track your order</h1>
        <p className="text-sm text-slate-500">
          Order #{orderId} • {customer?.name || 'Customer'}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <p className="text-sm text-slate-500">Current status</p>
                <p className="text-2xl font-semibold capitalize text-slate-900">{formatStatus(status)}</p>
              </div>
              <Badge variant="secondary">{trackingNumber ? `Tracking: ${trackingNumber}` : 'In transit'}</Badge>
            </div>
            <div className="h-[420px]">
              {hasLocation ? (
                <MapContainer
                  key={orderId}
                  center={center}
                  zoom={13}
                  scrollWheelZoom={false}
                  className="h-full w-full rounded-b-2xl"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <AnimatedMarker location={location} />
                </MapContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <p className="text-base font-medium text-slate-700">Driver has not shared a location yet.</p>
                  <p className="text-sm text-slate-500">We will update this map the moment we receive a ping.</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
            {renderStatusTimeline()}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Order summary</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>Status</span>
                <span className="font-medium capitalize text-slate-900">{formatStatus(status)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total</span>
                <span className="font-semibold text-slate-900">
                  {amount ? `PKR ${Number(amount).toFixed(2)}` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Driver ping</span>
                <span className="text-slate-900">
                  {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Awaiting first ping'}
                </span>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-slate-50 p-4 text-xs text-slate-500">
              Location updates are secured with your session. Only you (and our ops team) can view this data.
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Need help?</h3>
            <p className="mt-2 text-sm text-slate-500">
              If the map or status looks stuck, tap refresh to pull the latest data from our servers.
            </p>
            <Button className="mt-4 w-full" onClick={() => dispatch(fetchOrderTracking(orderId))}>
              Refresh tracking
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackOrderPage;

