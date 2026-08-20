import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

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
  // Center on Gorakhpur (26.7606, 83.3732)
  const defaultCenter: [number, number] = [26.7606, 83.3732];

  return (
    <div className="w-full h-[540px] rounded-2xl overflow-hidden border border-slate-800 shadow-xl relative">
      <MapContainer
        center={defaultCenter}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
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
