import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Compass, Layers, Radio, Target, Gauge, Mountain, Activity, CheckCircle2, Search, MapPin, Sparkles } from 'lucide-react';
import { WorkerApiClient } from '../services/api';

// Google Maps Clean & High-Definition Radar Tile Styles
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
    attribution: '&copy; CartoDB'
  },
  {
    name: 'Dark Obsidian',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB'
  }
];

// Device Locator Pulsing Radar Marker Icon with Direction Arrow
const createWorkerRadarBeaconIcon = (heading: number = 0) => {
  return L.divIcon({
    className: 'device-locator-radar-icon',
    html: `
      <div style="
        position: relative;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          position: absolute;
          width: 48px;
          height: 48px;
          background: rgba(16, 185, 129, 0.25);
          border: 2px solid #10b981;
          border-radius: 50%;
          box-shadow: 0 0 20px #10b981;
          animation: lightPulse 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
        <div style="
          position: relative;
          z-index: 10;
          width: 24px;
          height: 24px;
          background: #10b981;
          border: 2.5px solid #ffffff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 12px #10b981;
          transform: rotate(${heading}deg);
          transition: transform 0.4s ease;
        ">
          <div style="
            width: 0;
            height: 0;
            border-left: 4px solid transparent;
            border-right: 4px solid transparent;
            border-bottom: 7px solid #ffffff;
            margin-top: -2px;
          "></div>
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24]
  });
};

const MapController: React.FC<{ center: [number, number]; trigger: number }> = ({ center, trigger }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.panTo(center, { animate: true, duration: 0.8 });
    }
  }, [center, trigger, map]);
  return null;
};

// Click on map to calibrate exact pinpoint position
const MapClickHandler: React.FC<{ onLocationSet: (lat: number, lng: number) => void }> = ({ onLocationSet }) => {
  useMapEvents({
    click(e) {
      onLocationSet(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
};

interface WorkerRadarWidgetProps {
  initialLat?: number;
  initialLng?: number;
  workerName?: string;
  isOnline?: boolean;
}

export const WorkerRadarWidget: React.FC<WorkerRadarWidgetProps> = ({
  initialLat = 26.7606,
  initialLng = 83.3732,
  workerName = 'Service Partner',
  isOnline = true
}) => {
  const [workerPos, setWorkerPos] = useState<[number, number]>(() => {
    try {
      const saved = localStorage.getItem('nw_worker_calibrated_location');
      return saved ? JSON.parse(saved) : [initialLat, initialLng];
    } catch {
      return [initialLat, initialLng];
    }
  });
  const [accuracy, setAccuracy] = useState<number>(2.5);
  const [heading, setHeading] = useState<number>(0);
  const [altitude, setAltitude] = useState<number>(124);
  const [speed, setSpeed] = useState<number>(0);
  const [tileStyleIndex, setTileStyleIndex] = useState<number>(0);
  const [recenterTrigger, setRecenterTrigger] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [addressLabel, setAddressLabel] = useState('Gorakhpur, UP');

  // Reverse geocode initial/current coordinates
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`
      );
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const road = addr.road || addr.suburb || addr.neighbourhood || 'Civil Lines';
        const city = addr.city || addr.town || 'Gorakhpur';
        setAddressLabel(`${road}, ${city}`);
      }
    } catch {}
  };

  useEffect(() => {
    reverseGeocode(workerPos[0], workerPos[1]);
  }, []);

  // Hardware GPS Watcher
  useEffect(() => {
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, heading: h, speed: s, altitude: a, accuracy: acc } = pos.coords;
          // If user hasn't manually calibrated, use browser coords
          const hasManual = localStorage.getItem('nw_worker_calibrated_location');
          if (!hasManual) {
            setWorkerPos([latitude, longitude]);
            if (acc) setAccuracy(acc);
            reverseGeocode(latitude, longitude);
          }
          if (h) setHeading(h);
          if (a) setAltitude(Math.round(a));
          if (s !== null) setSpeed(Math.round(s * 3.6));
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 0, timeout: 6000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const handleManualLocationSet = (lat: number, lng: number) => {
    setWorkerPos([lat, lng]);
    setAccuracy(2.5);
    localStorage.setItem('nw_worker_calibrated_location', JSON.stringify([lat, lng]));
    reverseGeocode(lat, lng);
    setRecenterTrigger((p) => p + 1);

    // Sync to backend DB
    WorkerApiClient.request('/worker/location', {
      method: 'POST',
      body: JSON.stringify({
        latitude: lat,
        longitude: lng,
        accuracy: 2.5,
        speed: 0,
        heading: 0,
        altitude: 124
      })
    }).catch(() => {});
  };

  const handleSearchLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery + ', Gorakhpur, UP')}&format=json&limit=1`
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          handleManualLocationSet(lat, lon);
          setAddressLabel(data[0].display_name.split(',').slice(0, 2).join(','));
          setSearchQuery('');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const radarIcon = useMemo(() => createWorkerRadarBeaconIcon(heading), [heading]);
  const currentStyle = TILE_STYLES[tileStyleIndex];

  return (
    <div className="w-full rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-slate-900/90 backdrop-blur-md px-4 sm:px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="relative flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 shadow-[0_0_12px_#10b981]"></span>
          </div>
          <div>
            <h3 className="font-extrabold text-sm tracking-wide text-white flex items-center gap-2">
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Google Maps GPS Radar
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Live Dispatch
              </span>
            </h3>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <div className={`px-3 py-1 rounded-full flex items-center space-x-1.5 font-medium ${
            isOnline ? 'bg-emerald-950/80 border border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border border-slate-700 text-slate-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' : 'bg-slate-500'}`}></span>
            <span className="text-[11px]">{isOnline ? 'Listening for Jobs' : 'Offline'}</span>
          </div>
          <button
            onClick={() => setTileStyleIndex((prev) => (prev + 1) % TILE_STYLES.length)}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3 py-1 rounded-full flex items-center space-x-1.5 font-medium transition cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px]">{currentStyle.name}</span>
          </button>
        </div>
      </div>

      {/* Search Exact Location / Colony Bar */}
      <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center gap-2">
        <form onSubmit={handleSearchLocation} className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Search your exact colony / landmark (or click on map)..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 text-white rounded-xl text-xs border border-slate-700 focus:outline-none focus:border-emerald-500 placeholder-slate-500"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer"
          >
            {isSearching ? 'Locating...' : 'Set Pin'}
          </button>
        </form>
      </div>

      {/* Map Engine */}
      <div className="relative w-full h-72 sm:h-80 bg-slate-900">
        <MapContainer
          center={workerPos}
          zoom={15}
          zoomControl={false}
          scrollWheelZoom={true}
          className="w-full h-full"
        >
          <TileLayer
            key={currentStyle.url}
            attribution={currentStyle.attribution}
            url={currentStyle.url}
          />

          {/* Service Dispatch Perimeter Circle (2.5km) */}
          <Circle
            center={workerPos}
            radius={2500}
            pathOptions={{
              color: '#10b981',
              fillColor: '#10b981',
              fillOpacity: 0.04,
              weight: 1,
              dashArray: '6, 6'
            }}
          />

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

          {/* Worker Pulsing Radar Beacon */}
          <Marker position={workerPos} icon={radarIcon}>
            <Popup>
              <div className="p-1 text-slate-900 text-xs">
                <p className="font-bold text-emerald-600">⚡ {workerName}</p>
                <p className="text-[10px] text-slate-600 font-semibold">{addressLabel}</p>
                <p className="text-[9px] text-slate-400 mt-0.5">
                  {workerPos[0].toFixed(4)}°N, {workerPos[1].toFixed(4)}°E (±{accuracy.toFixed(1)}m)
                </p>
              </div>
            </Popup>
          </Marker>

          <MapController center={workerPos} trigger={recenterTrigger} />
          <MapClickHandler onLocationSet={handleManualLocationSet} />
        </MapContainer>

        {/* Floating Controls */}
        <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2">
          <button
            onClick={() => setRecenterTrigger((p) => p + 1)}
            className="bg-slate-900/95 hover:bg-slate-800 text-emerald-400 border border-emerald-500/40 px-3 py-1.5 rounded-xl shadow-lg backdrop-blur-md text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>🎯 Recenter</span>
          </button>
        </div>

        {/* Instruction Tip */}
        <div className="absolute bottom-3 left-3 z-[400] bg-slate-950/95 backdrop-blur-md border border-slate-800 px-3.5 py-2 rounded-xl shadow-xl flex items-center gap-2 text-xs">
          <MapPin className="w-4 h-4 text-emerald-400 animate-pulse flex-shrink-0" />
          <div className="leading-tight">
            <span className="font-bold text-white block">{addressLabel}</span>
            <span className="text-[10px] text-slate-400">💡 Click anywhere on map to pin your exact location</span>
          </div>
        </div>
      </div>

      {/* Telemetry HUD Grid */}
      <div className="bg-slate-900/95 border-t border-slate-800 p-3 sm:p-4 grid grid-cols-3 gap-2 text-center">
        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-2">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">GPS Precision</span>
          <span className="text-sm font-black text-emerald-400">±{accuracy.toFixed(1)}m</span>
        </div>
        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-2">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Hardware Speed</span>
          <span className="text-sm font-black text-white">{speed} km/h</span>
        </div>
        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-2">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Signal Lock</span>
          <span className="text-sm font-black text-cyan-400">100% 5G</span>
        </div>
      </div>
    </div>
  );
};
