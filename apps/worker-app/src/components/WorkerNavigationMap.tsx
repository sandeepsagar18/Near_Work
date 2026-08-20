import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Compass, Layers, Radio, ExternalLink, MapPin, Gauge, Target, Mountain, Activity, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { getWorkerSocket } from '../services/socket';
import { WorkerApiClient } from '../services/api';
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

// Custom Worker Live Vehicle Navigation Marker Icon (👷 / Vehicle Pointer)
const createWorkerNavigationIcon = (heading: number = 0) => {
  return L.divIcon({
    className: 'worker-nav-marker-icon',
    html: `
      <div style="
        position: relative;
        width: 52px;
        height: 52px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <!-- Pulsing Radar Wave -->
        <div style="
          position: absolute;
          width: 52px;
          height: 52px;
          background: rgba(16, 185, 129, 0.25);
          border: 2px solid #10b981;
          border-radius: 50%;
          box-shadow: 0 0 20px #10b981;
          animation: lightPulse 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>

        <!-- Google Navigation Vehicle Arrow Core -->
        <div style="
          position: relative;
          z-index: 10;
          width: 32px;
          height: 32px;
          background: #10b981;
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

export interface WorkerNavigationMapProps {
  bookingId?: string;
  customerLat: number;
  customerLng: number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  isEnRoute?: boolean;
  onArrivedSuccess?: () => void;
}

export const WorkerNavigationMap: React.FC<WorkerNavigationMapProps> = ({
  bookingId,
  customerLat,
  customerLng,
  customerName = 'Customer',
  customerPhone,
  customerAddress = 'Customer Location',
  isEnRoute = true,
  onArrivedSuccess
}) => {
  const [workerPos, setWorkerPos] = useState<[number, number]>([customerLat - 0.012, customerLng - 0.015]);
  const [targetPos, setTargetPos] = useState<[number, number]>(workerPos);
  const [speed, setSpeed] = useState<number>(35);
  const [altitude, setAltitude] = useState<number>(128);
  const [accuracy, setAccuracy] = useState<number>(2.5);
  const [heading, setHeading] = useState<number>(45);
  const [pathHistory, setPathHistory] = useState<[number, number][]>([]);

  // Road Routing States
  const [routePolyline, setRoutePolyline] = useState<[number, number][]>([]);
  const [roadDistanceKm, setRoadDistanceKm] = useState<number>(2.4);
  const [roadEtaMinutes, setRoadEtaMinutes] = useState<number>(8);
  const [tileStyleIndex, setTileStyleIndex] = useState<number>(0);
  const [recenterTrigger, setRecenterTrigger] = useState<number>(0);

  // Arrived Action States
  const [isMarkingArrived, setIsMarkingArrived] = useState(false);
  const [arrivedError, setArrivedError] = useState<string | null>(null);
  const [hasArrived, setHasArrived] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const lastBroadcastTimeRef = useRef<number>(0);
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
        return [current[0] + dLat * 0.15, current[1] + dLng * 0.15];
      });
      animationFrameId = requestAnimationFrame(animateMarker);
    };

    animationFrameId = requestAnimationFrame(animateMarker);
    return () => cancelAnimationFrame(animationFrameId);
  }, [targetPos]);

  // Recalculate driving road route
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

  // Hardware GPS Watcher + Throttled Socket.IO Broadcaster
  useEffect(() => {
    const socket = getWorkerSocket();
    if (bookingId) {
      socket.emit('booking:join', { bookingId });
    }

    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, heading: h, speed: s, altitude: a, accuracy: acc } = pos.coords;
          const newPos: [number, number] = [latitude, longitude];
          setTargetPos(newPos);
          setPathHistory((prev) => {
            const next = [...prev, newPos];
            return next.length > 100 ? next.slice(-100) : next;
          });

          const spdKmh = s !== null && s !== undefined && s > 0 ? Math.round(s * 3.6) : 35;
          setSpeed(spdKmh);
          if (acc) setAccuracy(Number(acc));
          if (a) setAltitude(Math.round(a));
          if (h) setHeading(h);

          // Throttled Socket.IO Broadcast (every 2.5s or meaningful move)
          const now = Date.now();
          if (now - lastBroadcastTimeRef.current >= 2500) {
            lastBroadcastTimeRef.current = now;
            socket.emit(SOCKET_EVENTS.WORKER_LOCATION_UPDATE, {
              bookingId,
              latitude,
              longitude,
              speed: spdKmh,
              heading: h || 0,
              accuracy: acc ? Math.round(acc) : 2.5,
              altitude: a ? Math.round(a) : 128,
              timestamp: now
            });
          }

          // Check if worker moved > 150m from last route calculation
          if (lastRouteCalculationPos.current) {
            const dLat = (latitude - lastRouteCalculationPos.current[0]) * 111;
            const dLng = (longitude - lastRouteCalculationPos.current[1]) * 111;
            const movedKm = Math.sqrt(dLat * dLat + dLng * dLng);
            if (movedKm > 0.15) {
              updateDrivingRoute(latitude, longitude);
            }
          }
        },
        (err) => {
          console.warn('Hardware GPS reading:', err.message);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 6000 }
      );
    }

    return () => {
      if (watchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [bookingId, updateDrivingRoute]);

  // Handle Arrived Button
  const handleMarkArrived = async () => {
    setIsMarkingArrived(true);
    setArrivedError(null);

    try {
      const res = await WorkerApiClient.request(`/bookings/${bookingId}/arrived`, {
        method: 'POST',
        body: JSON.stringify({
          latitude: workerPos[0],
          longitude: workerPos[1]
        })
      });

      if (res.success) {
        setHasArrived(true);
        if (onArrivedSuccess) {
          onArrivedSuccess();
        }
      } else {
        setArrivedError(res.message || 'Arrival verification failed. You may be too far from customer location.');
      }
    } catch (err: any) {
      setArrivedError(err.message || 'Failed to verify arrival. Please get closer to customer address.');
    } finally {
      setIsMarkingArrived(false);
    }
  };

  // Open Google Maps Turn-by-Turn Driving Navigation
  const openGoogleMapsDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${workerPos[0]},${workerPos[1]}&destination=${customerLat},${customerLng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const navIcon = useMemo(() => createWorkerNavigationIcon(heading), [heading]);
  const isAtPremises = roadDistanceKm <= 0.15 || hasArrived;
  const currentStyle = TILE_STYLES[tileStyleIndex];

  return (
    <div className="w-full rounded-3xl overflow-hidden shadow-2xl border border-slate-700 bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-slate-900 px-4 sm:px-6 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <span>Google Maps Navigation Cockpit</span>
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Live GPS Active
              </span>
            </h3>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={openGoogleMapsDirections}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3.5 py-1.5 rounded-full font-black flex items-center space-x-1.5 shadow-md shadow-emerald-500/20 transition cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="text-[11px]">Navigate in Google Maps</span>
          </button>

          <button
            onClick={() => setTileStyleIndex((prev) => (prev + 1) % TILE_STYLES.length)}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-full flex items-center space-x-1.5 font-medium transition cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
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
                <p className="font-bold text-red-600">🏠 Customer Service Destination</p>
                <p className="text-[10px] text-slate-600 font-semibold">{customerName}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{customerAddress}</p>
              </div>
            </Popup>
          </Marker>

          {/* Breadcrumb Trajectory History */}
          {pathHistory.length > 1 && (
            <Polyline
              positions={pathHistory}
              pathOptions={{
                color: '#10b981',
                weight: 4,
                opacity: 0.85,
                dashArray: '8, 8',
                lineJoin: 'round'
              }}
            />
          )}

          {/* Real Road Driving Route Polyline */}
          {routePolyline.length > 1 && (
            <Polyline
              positions={routePolyline}
              pathOptions={{
                color: isAtPremises ? '#10b981' : '#2563eb',
                weight: 5,
                opacity: 0.9,
                lineJoin: 'round'
              }}
            />
          )}

          {/* High-Accuracy GPS Precision Ring */}
          <Circle
            center={workerPos}
            radius={Math.min(100, Math.max(10, accuracy * 1.5))}
            pathOptions={{
              color: '#10b981',
              fillColor: '#10b981',
              fillOpacity: 0.15,
              weight: 1.5
            }}
          />

          {/* Worker Navigation Marker (👷 / Vehicle Pointer) */}
          <Marker position={workerPos} icon={navIcon}>
            <Popup>
              <div className="p-1.5 text-slate-900 text-xs font-sans">
                <p className="font-bold text-emerald-600">⚡ Your Live Vehicle Position</p>
                <p className="text-[10px] text-slate-600">
                  Speed: {speed} km/h • Accuracy: ±{accuracy.toFixed(1)}m
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
            <Compass className="w-4 h-4 text-emerald-600" />
            <span>🎯 Recenter</span>
          </button>
        </div>

        {/* Distance, ETA & Arrived Floating Bottom Card (Google Maps Style) */}
        <div className="absolute bottom-4 left-4 right-4 sm:right-auto z-[400] bg-white/95 backdrop-blur-md border border-gray-200 p-4 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-slate-900">
          <div className="flex items-center space-x-4">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                Trip ETA
              </span>
              <div className="text-2xl font-black text-slate-900">
                {hasArrived || isAtPremises ? 'Arrived at Doorstep' : `${roadEtaMinutes} mins away`}
              </div>
            </div>
            <div className="h-9 w-px bg-slate-200" />
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                Remaining Distance
              </span>
              <div className="text-lg font-black text-emerald-600">
                {hasArrived || isAtPremises ? 'Doorstep (0.0 km)' : `${roadDistanceKm.toFixed(1)} km`}
              </div>
            </div>
          </div>

          {/* Action Buttons: Navigate & Arrived */}
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
            <button
              onClick={openGoogleMapsDirections}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5 text-blue-600" />
              <span>Navigate</span>
            </button>

            {!hasArrived && (
              <button
                onClick={handleMarkArrived}
                disabled={isMarkingArrived}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center space-x-1.5 shadow-lg shadow-emerald-600/30 transition cursor-pointer active:scale-95"
              >
                {isMarkingArrived ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>I have Arrived</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Geofence Arrival Error Banner (if too far) */}
      {arrivedError && (
        <div className="bg-red-950/90 border-t border-red-500/40 p-3 px-5 text-red-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{arrivedError}</span>
        </div>
      )}

      {/* Real-time Hardware Telemetry HUD */}
      <div className="bg-slate-950 border-t border-slate-800 p-4 sm:p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-emerald-400" />
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
              <Mountain className="w-3.5 h-3.5 text-sky-400" />
              <span>Altitude</span>
            </span>
            <div className="text-lg font-black text-white">
              {altitude} <small className="text-xs text-slate-400 font-normal">m</small>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Telemetry Stream</span>
            </span>
            <div className="text-lg font-black text-emerald-400 flex items-center gap-1.5">
              <span>Streaming</span>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/30">
                1Hz
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
