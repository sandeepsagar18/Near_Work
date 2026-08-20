import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { AdminLiveMap } from '../components/AdminLiveMap';
import { AdminApiClient } from '../services/api';
import { RefreshCw, Users, MapPin } from 'lucide-react';

export const AdminLiveMapPage: React.FC = () => {
  const [mapData, setMapData] = useState<{ workers: any[]; bookings: any[] }>({
    workers: [],
    bookings: []
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchLiveMap = async () => {
    setIsLoading(true);
    try {
      const res = await AdminApiClient.request('/admin/live-map');
      if (res.success && res.data) {
        setMapData(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveMap();
    const interval = setInterval(fetchLiveMap, 15000); // 15s refresh
    return () => clearInterval(interval);
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black text-white">Live Field Operations Map</h1>
            <p className="text-xs text-slate-400">
              Live tracking of online service partners and active customer job locations
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-4 text-xs font-bold bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl">
              <span className="flex items-center text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                {mapData.workers.length} On-Duty Partners
              </span>
              <span className="flex items-center text-indigo-400">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 mr-1.5"></span>
                {mapData.bookings.length} Active Jobs
              </span>
            </div>

            <button
              onClick={fetchLiveMap}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Leaflet Live Map */}
        <AdminLiveMap
          workers={mapData.workers}
          bookings={mapData.bookings}
        />
      </div>
    </AdminLayout>
  );
};
