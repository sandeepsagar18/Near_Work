import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Compass, Layers, Radio, ExternalLink, MapPin } from 'lucide-react';

// Fix default marker icon issues in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Device Locator Clean Light Tile Engine
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://carto.com/">CartoDB</a>';

// Customer Destination Icon
const customerHomeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [28, 45],
  iconAnchor: [14, 45],
  popupAnchor: [1, -38],
  shadowSize: [45, 45]
});

// Device Locator Clean Light Radar Beacon Icon
const createLightDeviceRadarIcon = () => {
  return L.divIcon({
    className: 'device-locator-radar-icon',
    html: `
      <div style="
        position: relative;
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          position: absolute;
          width: 44px;
          height: 44px;
          background: rgba(14, 165, 233, 0.25);
          border: 2px solid #0284c7;
          border-radius: 50%;
          box-shadow: 0 0 16px rgba(14, 165, 233, 0.5);
          animation: lightPulse 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
        <div style="
          position: relative;
          z-index: 10;
          width: 18px;
          height: 18px;
          background: #0284c7;
          border: 2.5px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(2, 132, 199, 0.6);
        "></div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22]
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

// Controller to Pan & Adjust Map
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

interface WorkerLiveNavigationMapProps {
  customerLat: number;
  customerLng: number;
  customerAddress?: string;
  isEnRoute?: boolean;
}

export const WorkerLiveNavigationMap: React.FC<WorkerLiveNavigationMapProps> = ({
  customerLat,
  customerLng,
  customerAddress = 'Customer Premises'
}) => {
  const [workerPos, setWorkerPos] = useState<[number, number]>([customerLat, customerLng]);
  const [realSpeed, setRealSpeed] = useState<number>(0);
  const [realAltitude, setRealAltitude] = useState<number>(128);
  const [realAccuracy, setRealAccuracy] = useState<number>(2.5);
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  // Watch real hardware GPS
  useEffect(() => {
    let watchId: number | null = null;
    let lastPos: { lat: number; lng: number; time: number } | null = null;

    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, speed, altitude, accuracy } = pos.coords;
          const now = Date.now();
          setWorkerPos([latitude, longitude]);

          if (speed !== null && speed !== undefined && !isNaN(speed) && speed > 0) {
            setRealSpeed(Math.round(speed * 3.6));
          } else if (lastPos) {
            const timeDiffHours = (now - lastPos.time) / (1000 * 60 * 60);
            if (timeDiffHours > 0) {
              const d = calculateDistanceKm(lastPos.lat, lastPos.lng, latitude, longitude);
              setRealSpeed(Math.min(120, Math.round(d / timeDiffHours)));
            }
          }

          if (accuracy) setRealAccuracy(Math.round(accuracy * 10) / 10);
          if (altitude) setRealAltitude(Math.round(altitude));
          lastPos = { lat: latitude, lng: longitude, time: now };
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
      );
    }

    return () => {
      if (watchId !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  const radarIcon = useMemo(() => createLightDeviceRadarIcon(), []);
  const rawDistanceKm = calculateDistanceKm(workerPos[0], workerPos[1], customerLat, customerLng);
  // Within 150m (0.15 km) geofence = exact premises location (0.0 km)
  const isAtPremises = rawDistanceKm <= 0.15;
  const distanceKm = isAtPremises ? 0 : rawDistanceKm;
  const etaMins = isAtPremises ? 1 : Math.max(1, Math.round((distanceKm / (realSpeed > 0 ? realSpeed : 30)) * 60));

  const handleRecenter = () => {
    setRecenterTrigger((prev) => prev + 1);
  };

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${customerLat},${customerLng}`;

  return (
    <div className="w-full rounded-3xl overflow-hidden shadow-xl border border-slate-800 bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <span>Device Locator GPS</span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-500/40">
                Active Telemetry
              </span>
            </h3>
          </div>
        </div>

        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center space-x-1.5 shadow-md transition-transform active:scale-95"
        >
          <span>Google Maps</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Main Map */}
      <div className="relative w-full h-72 sm:h-80 md:h-96 bg-slate-100">
        <MapContainer
          center={workerPos}
          zoom={16}
          zoomControl={false}
          scrollWheelZoom={true}
          className="w-full h-full"
        >
          <TileLayer
            attribution={TILE_ATTRIBUTION}
            url={TILE_URL}
          />

          {/* Customer Destination Marker */}
          <Marker position={[customerLat, customerLng]} icon={customerHomeIcon}>
            <Popup>
              <div className="p-1 text-slate-900 text-xs">
                <strong>🏠 Destination</strong>
                <p className="text-[11px] text-gray-600">{customerAddress}</p>
              </div>
            </Popup>
          </Marker>

          {/* Worker Live GPS Radar Marker */}
          <Marker position={workerPos} icon={radarIcon}>
            <Popup>
              <div className="p-1 text-slate-900 text-xs">
                <strong>🔧 Your Live Position</strong>
                <p className="text-[11px] text-gray-600">Speed: {realSpeed} km/h</p>
              </div>
            </Popup>
          </Marker>

          {/* Geofence 150m Ring */}
          <Circle
            center={[customerLat, customerLng]}
            radius={150}
            pathOptions={{
              color: '#10b981',
              fillColor: '#10b981',
              fillOpacity: 0.12,
              weight: 1.5,
              dashArray: '4, 4'
            }}
          />

          {/* Route Line */}
          <Polyline
            positions={[workerPos, [customerLat, customerLng]]}
            pathOptions={{
              color: '#6366f1',
              weight: 3.5,
              opacity: 0.8,
              dashArray: '6, 6'
            }}
          />

          <MapController center={workerPos} recenterTrigger={recenterTrigger} />
        </MapContainer>

        {/* Floating Top Controls */}
        <div className="absolute top-3 right-3 z-10 flex items-center space-x-2">
          <button
            onClick={handleRecenter}
            className="bg-white/95 backdrop-blur-md border border-slate-300 text-slate-800 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-md cursor-pointer"
            title="Recenter Device"
          >
            <Compass className="w-3.5 h-3.5 text-sky-600 animate-spin" style={{ animationDuration: '6s' }} />
            <span>Recenter Device</span>
          </button>
        </div>

        {/* Live Status Overlay */}
        <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-md border border-slate-300 text-slate-900 px-3 py-1.5 rounded-xl shadow-md flex items-center space-x-2">
          <Radio className="w-3.5 h-3.5 text-sky-600 animate-pulse" />
          <span className="text-xs font-bold text-sky-800">
            {distanceKm > 0 ? `ETA ~${etaMins} mins (${distanceKm.toFixed(2)} km)` : 'At Doorstep (0.0 km)'}
          </span>
        </div>
      </div>

      {/* Telemetry Metrics Panel */}
      <div className="p-4 bg-slate-950 border-t border-slate-800">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Real Speed</span>
            <span className="text-xl font-black text-emerald-400 font-mono">
              {realSpeed} <small className="text-xs text-slate-400 font-sans">km/h</small>
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Distance</span>
            <span className="text-xl font-black text-white font-mono">
              {distanceKm.toFixed(2)} <small className="text-xs text-slate-400 font-sans">km</small>
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">GPS Accuracy</span>
            <span className="text-xl font-black text-indigo-400 font-mono">
              ±{realAccuracy} <small className="text-xs text-slate-400 font-sans">m</small>
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Altitude</span>
            <span className="text-xl font-black text-sky-400 font-mono">
              {realAltitude} <small className="text-xs text-slate-400 font-sans">m</small>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
