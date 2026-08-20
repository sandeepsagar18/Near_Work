import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Compass, Layers, Radio, Phone, MessageSquare, ShieldCheck, MapPin, Gauge, Target, Mountain, Activity, AlertCircle, RefreshCw } from 'lucide-react';
import { getSocket } from '../services/socket';
import { SOCKET_EVENTS } from '@nearwork/types';
import { fetchDrivingRoute } from '../utils/routeUtils';

// Fix default marker icon issues in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Google Maps & High-Definition Clean Navigation Tile Styles
const TILE_STYLES = [
  {
    name: 'Google Maps Clean',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
  },
  {
    name: 'Google Satellite Hybrid',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps Satellite',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
  },
  {
    name: 'Carto Voyager Clean',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB &copy; OpenStreetMap'
  },
  {
    name: 'Dark Obsidian',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB'
  }
];

// Customer Destination Pin (🏠)
const customerHomeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [30, 48],
  iconAnchor: [15, 48],
  popupAnchor: [1, -40],
  shadowSize: [48, 48]
});

// Custom Worker Marker Icon (👷 / Vehicle Pointer with Compass Heading & Pulsing Ring)
const createWorkerTrackingIcon = (heading: number = 0) => {
  return L.divIcon({
    className: 'worker-tracking-marker',
    html: `
      <div style="
        position: relative;
        width: 52px;
        height: 52px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <!-- Pulsing Wave Radar -->
        <div style="
          position: absolute;
          width: 52px;
          height: 52px;
          background: rgba(2, 132, 199, 0.25);
          border: 2px solid #0284c7;
          border-radius: 50%;
          box-shadow: 0 0 20px #0284c7;
          animation: lightPulse 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>

        <!-- Google Navigation Vehicle Arrow Core -->
        <div style="
          position: relative;
          z-index: 10;
          width: 32px;
          height: 32px;
          background: #0284c7;
          border: 3px solid #ffffff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.35);
          transform: rotate(${heading}deg);
          transition: transform 0.4s ease;
        ">
          <div style="
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-bottom: 10px solid #ffffff;
            margin-top: -2px;
          "></div>
        </div>
      </div>
    `,
    iconSize: [52, 52],
    iconAnchor: [26, 26]
  });
};

// Auto-Fit Map Bounds Controller
const MapBoundsController: React.FC<{
  workerPos: [number, number];
  customerPos: [number, number];
  recenterTrigger: number;
}> = ({ workerPos, customerPos, recenterTrigger }) => {
  const map = useMap();
  useEffect(() => {
    if (workerPos && customerPos) {
      const bounds = L.latLngBounds([workerPos, customerPos]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true });
    }
  }, [recenterTrigger, map]);
  return null;
};

export interface CustomerLiveTrackingMapProps {
  bookingId?: string;
  customerLat: number;
  customerLng: number;
  customerAddress?: string;
  workerLat?: number;
  workerLng?: number;
  workerName?: string;
  workerPhone?: string;
  workerRating?: number;
  workerStatus?: string;
  isEnRoute?: boolean;
  onCallWorker?: () => void;
  onChatWorker?: () => void;
}

export const CustomerLiveTrackingMap: React.FC<CustomerLiveTrackingMapProps> = ({
  bookingId,
  customerLat,
  customerLng,
  customerAddress = 'Your Service Location',
  workerLat,
  workerLng,
  workerName = 'Service Professional',
  workerPhone,
  workerRating = 4.9,
  workerStatus = 'WORKER_EN_ROUTE',
  isEnRoute = true,
  onCallWorker,
  onChatWorker
}) => {
  // Live Position States
  const [workerPos, setWorkerPos] = useState<[number, number]>(
    workerLat && workerLng ? [workerLat, workerLng] : [customerLat - 0.012, customerLng - 0.015]
  );
  const [targetPos, setTargetPos] = useState<[number, number]>(workerPos);
  const [heading, setHeading] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(32);
  const [accuracy, setAccuracy] = useState<number>(2.5);
  const [altitude, setAltitude] = useState<number>(124);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<number>(Date.now());
  const [secondsAgo, setSecondsAgo] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(true);

  // Road Routing States
  const [routePolyline, setRoutePolyline] = useState<[number, number][]>([]);
  const [roadDistanceKm, setRoadDistanceKm] = useState<number>(2.4);
  const [roadEtaMinutes, setRoadEtaMinutes] = useState<number>(8);
  const [tileStyleIndex, setTileStyleIndex] = useState<number>(0);
  const [recenterTrigger, setRecenterTrigger] = useState<number>(0);

  const lastRouteCalculationPos = useRef<[number, number] | null>(null);

  // Smooth Marker Animation / Interpolation Loop
  useEffect(() => {
    let animationFrameId: number;
    const animateMarker = () => {
      setWorkerPos((current) => {
        const dLat = targetPos[0] - current[0];
        const dLng = targetPos[1] - current[1];
        if (Math.abs(dLat) < 0.00001 && Math.abs(dLng) < 0.00001) {
          return targetPos;
        }
        // Smooth linear interpolation step (15% per frame)
        return [current[0] + dLat * 0.15, current[1] + dLng * 0.15];
      });
      animationFrameId = requestAnimationFrame(animateMarker);
    };

    animationFrameId = requestAnimationFrame(animateMarker);
    return () => cancelAnimationFrame(animationFrameId);
  }, [targetPos]);

  // Recalculate driving road route only when worker moves significantly (> 150m) or initial load
  const updateDrivingRoute = useCallback(
    async (origLat: number, origLng: number) => {
      try {
        const route = await fetchDrivingRoute(origLat, origLng, customerLat, customerLng);
        setRoutePolyline(route.polyline);
        setRoadDistanceKm(route.distanceKm);
        setRoadEtaMinutes(route.durationMinutes);
        lastRouteCalculationPos.current = [origLat, origLng];
      } catch (err) {
        console.warn('Driving route update error:', err);
      }
    },
    [customerLat, customerLng]
  );

  // Initial Route Load
  useEffect(() => {
    updateDrivingRoute(workerPos[0], workerPos[1]);
  }, []);

  // Sync external workerLat/Lng prop updates
  useEffect(() => {
    if (workerLat && workerLng && !isNaN(workerLat) && !isNaN(workerLng)) {
      setTargetPos([workerLat, workerLng]);
      setLastUpdatedTime(Date.now());
    }
  }, [workerLat, workerLng]);

  // Socket.IO Real-Time Tracking Room Listener
  useEffect(() => {
    const socket = getSocket();
    if (bookingId) {
      socket.emit('booking:join', { bookingId });
    }

    const handleLocationUpdate = (data: any) => {
      if (data?.latitude && data?.longitude) {
        const newLat = Number(data.latitude);
        const newLng = Number(data.longitude);
        setTargetPos([newLat, newLng]);
        if (data.heading !== undefined) setHeading(Number(data.heading));
        if (data.speed !== undefined) setSpeed(Number(data.speed));
        if (data.accuracy !== undefined) setAccuracy(Number(data.accuracy));
        if (data.altitude !== undefined) setAltitude(Math.round(Number(data.altitude)));
        setLastUpdatedTime(Date.now());
        setIsConnected(true);

        // Check if worker moved > 150m from last route recalculation point
        if (lastRouteCalculationPos.current) {
          const dLat = (newLat - lastRouteCalculationPos.current[0]) * 111;
          const dLng = (newLng - lastRouteCalculationPos.current[1]) * 111;
          const movedKm = Math.sqrt(dLat * dLat + dLng * dLng);
          if (movedKm > 0.15) {
            updateDrivingRoute(newLat, newLng);
          }
        }
      }
    };

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on(SOCKET_EVENTS.TRACKING_UPDATE, handleLocationUpdate);
    socket.on('worker:location:updated', handleLocationUpdate);
    socket.on(SOCKET_EVENTS.CONNECT, handleConnect);
    socket.on(SOCKET_EVENTS.DISCONNECT, handleDisconnect);

    return () => {
      socket.off(SOCKET_EVENTS.TRACKING_UPDATE, handleLocationUpdate);
      socket.off('worker:location:updated', handleLocationUpdate);
      socket.off(SOCKET_EVENTS.CONNECT, handleConnect);
      socket.off(SOCKET_EVENTS.DISCONNECT, handleDisconnect);
    };
  }, [bookingId, updateDrivingRoute]);

  // Seconds ago ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdatedTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdatedTime]);

  const workerIcon = useMemo(() => createWorkerTrackingIcon(heading), [heading]);
  const isAtPremises = roadDistanceKm <= 0.15 || workerStatus === 'WORKER_ARRIVED';
  const currentStyle = TILE_STYLES[tileStyleIndex];

  return (
    <div className="w-full rounded-3xl overflow-hidden shadow-2xl border border-slate-700 bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-slate-900 px-4 sm:px-6 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <span>Google Maps Live Tracking</span>
              <span className="text-[10px] font-mono font-bold text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded-full border border-sky-500/30">
                {isConnected ? 'Live Synchronized' : 'Reconnecting...'}
              </span>
            </h3>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 text-xs">
          <div className="text-[11px] text-slate-400 bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${secondsAgo > 15 ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
            <span>{secondsAgo === 0 ? 'Updated just now' : `Updated ${secondsAgo}s ago`}</span>
          </div>

          <button
            onClick={() => setTileStyleIndex((prev) => (prev + 1) % TILE_STYLES.length)}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-1 rounded-full flex items-center space-x-1.5 font-medium transition cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[11px]">{currentStyle.name}</span>
          </button>
        </div>
      </div>

      {/* Main Map Engine */}
      <div className="relative w-full h-80 sm:h-96 md:h-[460px] bg-slate-100">
        <MapContainer
          center={workerPos}
          zoom={16}
          zoomControl={false}
          scrollWheelZoom={true}
          className="w-full h-full"
        >
          <TileLayer
            key={currentStyle.url}
            attribution={currentStyle.attribution}
            url={currentStyle.url}
          />

          {/* Customer Destination Marker (🏠) */}
          <Marker position={[customerLat, customerLng]} icon={customerHomeIcon}>
            <Popup>
              <div className="p-1 text-slate-900 text-xs">
                <p className="font-bold text-red-600">🏠 Service Destination</p>
                <p className="text-[10px] text-slate-600 mt-0.5">{customerAddress}</p>
              </div>
            </Popup>
          </Marker>

          {/* Real Road Driving Route Polyline */}
          {routePolyline.length > 1 && (
            <Polyline
              positions={routePolyline}
              pathOptions={{
                color: isAtPremises ? '#10b981' : '#0284c7',
                weight: 5,
                opacity: 0.9,
                lineJoin: 'round'
              }}
            />
          )}

          {/* High-Accuracy Radius Circle */}
          <Circle
            center={workerPos}
            radius={Math.min(100, Math.max(10, accuracy * 1.5))}
            pathOptions={{
              color: '#0284c7',
              fillColor: '#0284c7',
              fillOpacity: 0.12,
              weight: 1.5
            }}
          />

          {/* Worker Navigation Marker (👷 / Vehicle Pointer) */}
          <Marker position={workerPos} icon={workerIcon}>
            <Popup>
              <div className="p-1.5 text-slate-900 text-xs font-sans">
                <p className="font-black text-sky-600 flex items-center gap-1">
                  <span>⚡</span> {workerName}
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Speed: <strong>{speed} km/h</strong> • Precision: <strong>±{accuracy.toFixed(1)}m</strong>
                </p>
              </div>
            </Popup>
          </Marker>

          <MapBoundsController
            workerPos={workerPos}
            customerPos={[customerLat, customerLng]}
            recenterTrigger={recenterTrigger}
          />
        </MapContainer>

        {/* Floating Quick Controls */}
        <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
          <button
            onClick={() => setRecenterTrigger((p) => p + 1)}
            className="bg-white/95 hover:bg-white text-slate-900 border border-gray-200 px-3.5 py-2 rounded-2xl shadow-xl backdrop-blur-md text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Compass className="w-4 h-4 text-sky-600" />
            <span>🎯 Recenter Route</span>
          </button>
        </div>

        {/* ETA & Distance Floating Bottom Card (Google Maps Style) */}
        <div className="absolute bottom-4 left-4 right-4 sm:right-auto z-[400] bg-white/95 backdrop-blur-md border border-gray-200 p-4 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-slate-900">
          <div className="flex items-center space-x-4">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                Estimated Arrival
              </span>
              <div className="text-2xl font-black text-slate-900">
                {isAtPremises ? 'Arrived at Your Door' : `${roadEtaMinutes} mins away`}
              </div>
            </div>
            <div className="h-9 w-px bg-slate-200" />
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                Remaining Distance
              </span>
              <div className="text-lg font-black text-sky-600">
                {isAtPremises ? 'Doorstep (0.0 km)' : `${roadDistanceKm.toFixed(1)} km`}
              </div>
            </div>
          </div>

          {/* Quick Call / Chat Worker Buttons */}
          {(onCallWorker || onChatWorker) && (
            <div className="flex items-center space-x-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 w-full sm:w-auto justify-end">
              {onChatWorker && (
                <button
                  onClick={onChatWorker}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
                  <span>Chat</span>
                </button>
              )}
              {onCallWorker && (
                <button
                  onClick={onCallWorker}
                  className="px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-sky-600/30 transition cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hardware Telemetry HUD */}
      <div className="bg-slate-950 border-t border-slate-800 p-4 sm:p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-sky-400" />
              <span>Speed</span>
            </span>
            <div className="text-lg font-black text-white">
              {speed} <small className="text-xs text-slate-400 font-normal">km/h</small>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              <span>GPS Precision</span>
            </span>
            <div className="text-lg font-black text-emerald-400">
              ±{accuracy.toFixed(1)} <small className="text-xs text-slate-400 font-normal">m</small>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Mountain className="w-3.5 h-3.5 text-cyan-400" />
              <span>Elevation</span>
            </span>
            <div className="text-lg font-black text-white">
              {altitude} <small className="text-xs text-slate-400 font-normal">m</small>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              <span>Telemetry Stream</span>
            </span>
            <div className="text-lg font-black text-sky-400 flex items-center gap-1.5">
              <span>Streaming</span>
              <span className="text-[10px] text-sky-400 font-bold bg-sky-950 px-1.5 py-0.5 rounded border border-sky-500/30">
                1Hz
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
