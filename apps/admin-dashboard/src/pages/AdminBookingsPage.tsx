import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { AdminApiClient } from '../services/api';
import { Calendar, User, Wrench, Clock, MapPin } from 'lucide-react';

export const AdminBookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const fetchBookings = async () => {
    try {
      const res = await AdminApiClient.request('/admin/bookings');
      if (res.success && res.data) {
        setBookings(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const filtered = bookings.filter((b) => {
    if (filterStatus === 'ALL') return true;
    return b.status === filterStatus;
  });

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black text-white">Bookings Audit & Dispatch</h1>
            <p className="text-xs text-slate-400">
              Complete platform ledger of service bookings, state history & payments
            </p>
          </div>

          <div className="flex space-x-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-semibold">
            {['ALL', 'SEARCHING_WORKER', 'WORKER_ACCEPTED', 'SERVICE_STARTED', 'COMPLETED', 'CUSTOMER_CANCELLED'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterStatus === st ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4">Booking # / Date</th>
                <th className="p-4">Service</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Assigned Worker</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4">
                    <strong className="block text-white text-xs">{b.bookingNumber}</strong>
                    <span className="text-[10px] text-slate-400">{b.scheduledDate} • {b.scheduledTimeSlot}</span>
                  </td>

                  <td className="p-4">
                    <strong className="block text-white">{b.service?.name}</strong>
                    <span className="text-[10px] text-slate-400">{b.address?.city}</span>
                  </td>

                  <td className="p-4">
                    <span className="text-white font-semibold block">{b.customer?.name}</span>
                    <span className="text-[10px] text-slate-400">{b.customer?.phone}</span>
                  </td>

                  <td className="p-4">
                    {b.worker ? (
                      <div>
                        <span className="text-emerald-400 font-semibold block">{b.worker.user?.name}</span>
                        <span className="text-[10px] text-slate-400">{b.worker.user?.phone}</span>
                      </div>
                    ) : (
                      <span className="text-amber-400 italic">Searching nearby...</span>
                    )}
                  </td>

                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-slate-800 text-slate-200 border border-slate-700">
                      {b.status.replace(/_/g, ' ')}
                    </span>
                  </td>

                  <td className="p-4 text-right">
                    <span className="font-extrabold text-white text-sm">₹{b.totalAmount}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};
