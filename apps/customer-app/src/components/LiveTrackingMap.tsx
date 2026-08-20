import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Compass, Layers, Radio, ExternalLink, MapPin, Gauge, Target, Mountain, Activity, ShieldCheck } from 'lucide-react';
import { getSocket } from '../services/socket';
import { SOCKET_EVENTS } from '@nearwork/types';

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

// Customer Destination Pin
const customerHomeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [30, 48],
  iconAnchor: [15, 48],
  popupAnchor: [1, -40],
  shadowSize: [48, 48]
});

// Google Maps Style Live Technician Marker with Pulsing Cyan Waves
const createCustomerTrackingRadarIcon = (heading: number = 0) => {
  return L.divIcon({
    className: 'customer-tracking-radar-icon',
    html: `
      <div style="
        position: relative;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <!-- Pulsing Wave -->
        <div style="
          position: absolute;
          width: 48px;
          height: 48px;
          background: rgba(14, 165, 233, 0.25);
          border: 2px solid #0284c7;
          border-radius: 50%;
          box-shadow: 0 0 20px #0284c7;
          animation: lightPulse 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>

        <!-- Google Navigation Direction Indicator -->
        <div style="
          position: relative;
          z-index: 10;
          width: 28px;
          height: 28px;
          background: #0284c7;
          border: 3px solid #ffffff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
          transform: rotate(${heading}deg);
          transition: transform 0.4s ease;
        ">
          <div style="
            width: 0;
            height: 0;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-bottom: 9px solid #ffffff;
            margin-top: -2px;
          "></div>
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24]
  });
};

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const MapController: React.FC<{
  center: [number, number];
  recenterTrigger: number;
}> = ({ center, recenterTrigger }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.panTo(center, { animate: true, duration: 0.8 });
    }
  }, [center, recenterTrigger, map]);
  return null;
};

interface LiveTrackingMapProps {
  customerLat: number;
  customerLng: number;
  workerLat?: number;
  workerLng?: number;
  workerName?: string;
  isEnRoute?: boolean;
}

export const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({
  customerLat,
  customerLng,
  workerLat,
  workerLng,
  workerName = 'Service Partner',
  isEnRoute = true
}) => {
  const [workerPos, setWorkerPos] = useState<[number, number]>(
    workerLat && workerLng ? [workerLat, workerLng] : [customerLat - 0.012, customerLng - 0.015]
  );
  const [realSpeed, setRealSpeed] = useState<number>(38);
  const [realAltitude, setRealAltitude] = useState<number>(124);
  const [realAccuracy, setRealAccuracy] = useState<number>(2.5);
  const [realHeading, setRealHeading] = useState<number>(0);
  const [pathHistory, setPathHistory] = useState<[number, number][]>([]);
  const [tileStyleIndex, setTileStyleIndex] = useState<number>(0);
  const [recenterTrigger, setRecenterTrigger] = useState<number>(0);

  useEffect(() => {
    if (workerLat && workerLng && !isNaN(workerLat) && !isNaN(workerLng)) {
      setWorkerPos([workerLat, workerLng]);
      setPathHistory((prev) => [...prev, [workerLat, workerLng]]);
    }
  }, [workerLat, workerLng]);

  useEffect(() => {
    const socket = getSocket();

    const handleTracking = (data: any) => {
      if (data?.latitude && data?.longitude) {
        const newPos: [number, number] = [data.latitude, data.longitude];
        setWorkerPos(newPos);
        setPathHistory((prev) => {
          const next = [...prev, newPos];
          return next.length > 100 ? next.slice(-100) : next;
        });

        if (data.speed !== undefined && data.speed !== null) setRealSpeed(Number(data.speed));
        if (data.accuracy !== undefined) setRealAccuracy(Number(data.accuracy));
        if (data.altitude !== undefined) setRealAltitude(Math.round(Number(data.altitude)));
        if (data.heading !== undefined) setRealHeading(Number(data.heading));
      }
    };

    socket.on(SOCKET_EVENTS.TRACKING_UPDATE, handleTracking);
    return () => {
      socket.off(SOCKET_EVENTS.TRACKING_UPDATE, handleTracking);
    };
  }, []);

  const radarIcon = useMemo(() => createCustomerTrackingRadarIcon(realHeading), [realHeading]);

  const rawDistanceKm = calculateDistanceKm(workerPos[0], workerPos[1], customerLat, customerLng);
  const isAtPremises = rawDistanceKm <= 0.15;
  const distanceKm = isAtPremises ? 0 : rawDistanceKm;
  const etaMins = isAtPremises ? 1 : Math.max(1, Math.round((distanceKm / (realSpeed > 0 ? realSpeed : 30)) * 60));

  const handleRecenter = () => {
    setRecenterTrigger((prev) => prev + 1);
  };

  const handleToggleStyle = () => {
    setTileStyleIndex((prev) => (prev + 1) % TILE_STYLES.length);
  };

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
                Turn-by-Turn GPS
              </span>
            </h3>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={handleToggleStyle}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-full flex items-center space-x-1.5 font-medium transition cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[11px]">{currentStyle.name}</span>
          </button>
        </div>
      </div>

      {/* Main Map Engine */}
      <div className="relative w-full h-80 sm:h-96 md:h-[440px] bg-slate-100">
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

          {/* Customer Destination Marker */}
          <Marker position={[customerLat, customerLng]} icon={customerHomeIcon}>
            <Popup>
              <div className="p-1 text-slate-900 text-xs">
                <p className="font-bold text-red-600">🏠 Your Delivery Address</p>
                <p className="text-[10px] text-slate-600 mt-0.5">Technician will arrive here</p>
              </div>
            </Popup>
          </Marker>

          {/* Breadcrumb Trajectory History */}
          {pathHistory.length > 1 && (
            <Polyline
              positions={pathHistory}
              pathOptions={{
                color: '#0284c7',
                weight: 4,
                opacity: 0.85,
                dashArray: '8, 8',
                lineJoin: 'round'
              }}
            />
          )}

          {/* Route Line to Destination */}
          <Polyline
            positions={[workerPos, [customerLat, customerLng]]}
            pathOptions={{
              color: isAtPremises ? '#10b981' : '#0284c7',
              weight: 5,
              opacity: 0.85
            }}
          />

          {/* High-Accuracy Radius Circle */}
          <Circle
            center={workerPos}
            radius={Math.min(100, Math.max(10, realAccuracy * 1.5))}
            pathOptions={{
              color: '#0284c7',
              fillColor: '#0284c7',
              fillOpacity: 0.12,
              weight: 1.5
            }}
          />

          {/* Worker Navigation Marker */}
          <Marker position={workerPos} icon={radarIcon}>
            <Popup>
              <div className="p-1.5 text-slate-900 text-xs font-sans">
                <p className="font-black text-sky-600 flex items-center gap-1">
                  <span>⚡</span> {workerName}
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Speed: <strong>{realSpeed} km/h</strong> • Accuracy: <strong>±{realAccuracy.toFixed(1)}m</strong>
                </p>
              </div>
            </Popup>
          </Marker>

          <MapController center={workerPos} recenterTrigger={recenterTrigger} />
        </MapContainer>

        {/* Floating Quick Controls */}
        <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
          <button
            onClick={handleRecenter}
            className="bg-white/95 hover:bg-white text-slate-900 border border-gray-200 px-3.5 py-2 rounded-2xl shadow-xl backdrop-blur-md text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Compass className="w-4 h-4 text-sky-600" />
            <span>🎯 Recenter</span>
          </button>
        </div>

        {/* ETA Floating Card (Google Maps Style) */}
        <div className="absolute bottom-4 left-4 right-4 sm:right-auto z-[400] bg-white/95 backdrop-blur-md border border-gray-200 p-3.5 rounded-2xl shadow-2xl flex items-center justify-between sm:justify-start gap-4 text-slate-900">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              Estimated Arrival
            </span>
            <div className="text-xl font-black text-slate-900">
              {isAtPremises ? 'Arrived at Your Door' : `${etaMins} mins away`}
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              Remaining Distance
            </span>
            <div className="text-base font-black text-sky-600">
              {isAtPremises ? 'Doorstep (0.0 km)' : `${distanceKm.toFixed(2)} km`}
            </div>
          </div>
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
              {realSpeed} <small className="text-xs text-slate-400 font-normal">km/h</small>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              <span>GPS Precision</span>
            </span>
            <div className="text-lg font-black text-emerald-400">
              ±{realAccuracy.toFixed(1)} <small className="text-xs text-slate-400 font-normal">m</small>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Mountain className="w-3.5 h-3.5 text-cyan-400" />
              <span>Elevation</span>
            </span>
            <div className="text-lg font-black text-white">
              {realAltitude} <small className="text-xs text-slate-400 font-normal">m</small>
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
