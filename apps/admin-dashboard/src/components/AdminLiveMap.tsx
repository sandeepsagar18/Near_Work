import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Layers } from 'lucide-react';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

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

const workerOnlineIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const activeJobIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface AdminLiveMapProps {
  workers: any[];
  bookings: any[];
}

export const AdminLiveMap: React.FC<AdminLiveMapProps> = ({ workers, bookings }) => {
  const defaultCenter: [number, number] = [26.7606, 83.3732];
  const [tileStyleIndex, setTileStyleIndex] = useState(0);
  const currentStyle = TILE_STYLES[tileStyleIndex];

  return (
    <div className="w-full h-[540px] rounded-2xl overflow-hidden border border-slate-800 shadow-xl relative">
      {/* Floating Layer Switcher */}
      <div className="absolute top-3 right-3 z-[400]">
        <button
          onClick={() => setTileStyleIndex((prev) => (prev + 1) % TILE_STYLES.length)}
          className="bg-slate-900/95 hover:bg-slate-800 border border-slate-700 text-slate-200 px-3.5 py-1.5 rounded-xl shadow-lg backdrop-blur-md text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span>{currentStyle.name}</span>
        </button>
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          key={currentStyle.url}
          attribution={currentStyle.attribution}
          url={currentStyle.url}
        />

        {/* On-Duty Workers Markers */}
        {workers.map((w) => {
          if (!w.currentLat || !w.currentLng) return null;
          return (
            <Marker
              key={w.id}
              position={[w.currentLat, w.currentLng]}
              icon={workerOnlineIcon}
            >
              <Popup>
                <div className="text-xs text-gray-900 font-sans p-1">
                  <strong className="block text-sm text-green-700">{w.user?.name}</strong>
                  <span>Status: <strong>{w.status}</strong></span><br />
                  <span>Rating: ⭐ {w.averageRating} ({w.totalJobsCompleted} jobs)</span><br />
                  <span>Skills: {w.skills?.map((s: any) => s.category?.name).join(', ')}</span>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Active Bookings Markers */}
        {bookings.map((b) => {
          if (!b.address?.latitude || !b.address?.longitude) return null;
          return (
            <Marker
              key={b.id}
              position={[b.address.latitude, b.address.longitude]}
              icon={activeJobIcon}
            >
              <Popup>
                <div className="text-xs text-gray-900 font-sans p-1">
                  <strong className="block text-sm text-indigo-700">#{b.bookingNumber}</strong>
                  <span>Service: <strong>{b.service?.name}</strong></span><br />
                  <span>Customer: {b.customer?.name} ({b.customer?.phone})</span><br />
                  <span>Status: <strong className="text-amber-600">{b.status}</strong></span><br />
                  <span>Worker: {b.worker?.user?.name || 'Unassigned'}</span>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
