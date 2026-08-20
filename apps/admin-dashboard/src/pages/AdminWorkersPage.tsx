import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { AdminApiClient } from '../services/api';
import { ShieldCheck, XCircle, AlertTriangle, Star, Check, FileText } from 'lucide-react';

export const AdminWorkersPage: React.FC = () => {
  const [workers, setWorkers] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const fetchWorkers = async () => {
    try {
      const res = await AdminApiClient.request('/admin/workers');
      if (res.success && res.data) {
        setWorkers(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  const handleUpdateVerification = async (workerId: string, status: string) => {
    try {
      const res = await AdminApiClient.request(`/admin/workers/${workerId}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ verificationStatus: status })
      });
      if (res.success) {
        setMsg(`Worker status successfully updated to ${status}`);
        fetchWorkers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = workers.filter((w) => {
    if (filterStatus === 'ALL') return true;
    return w.verificationStatus === filterStatus;
  });

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black text-white">Worker KYC Verification & Supply</h1>
            <p className="text-xs text-slate-400">
              Audit government documents, verify skill certifications & activate partners
            </p>
          </div>

          <div className="flex space-x-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-semibold">
            {['ALL', 'PENDING', 'VERIFIED', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterStatus === st ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {msg && (
          <div className="bg-emerald-950 border border-emerald-500 text-emerald-300 p-3 rounded-2xl text-xs">
            {msg}
          </div>
        )}

        {/* Workers Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4">Partner</th>
                <th className="p-4">Skills & Exp</th>
                <th className="p-4">Status</th>
                <th className="p-4">KYC Document</th>
                <th className="p-4">Rating / Jobs</th>
                <th className="p-4 text-right">Verification Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((w) => (
                <tr key={w.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4">
                    <strong className="block text-white text-sm">{w.user?.name}</strong>
                    <span className="text-[11px] text-slate-400">{w.user?.email} • {w.user?.phone}</span>
                    <span className="text-[10px] text-slate-500 block">{w.address}</span>
                  </td>

                  <td className="p-4">
                    <div className="space-y-1">
                      <span className="bg-slate-800 text-slate-200 px-2 py-0.5 rounded-md font-semibold text-[10px] inline-block">
                        {w.skills?.map((s: any) => s.category?.name).join(', ') || 'General'}
                      </span>
                      <span className="text-[10px] text-slate-400 block">{w.experienceYears} Years Exp</span>
                    </div>
                  </td>

                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        w.verificationStatus === 'VERIFIED'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                          : w.verificationStatus === 'PENDING'
                          ? 'bg-amber-950 text-amber-400 border border-amber-500/30'
                          : 'bg-red-950 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {w.verificationStatus}
                    </span>
                  </td>

                  <td className="p-4">
                    {w.idProofUrl ? (
                      <a
                        href={w.idProofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:underline flex items-center space-x-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{w.idProofType || 'Aadhaar / ID'}</span>
                      </a>
                    ) : (
                      <span className="text-slate-500">Self-attested</span>
                    )}
                  </td>

                  <td className="p-4">
                    <div className="flex items-center text-amber-400 font-bold space-x-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{w.averageRating}</span>
                      <span className="text-slate-500 font-normal">({w.totalJobsCompleted} jobs)</span>
                    </div>
                  </td>

                  <td className="p-4 text-right space-x-2">
                    {w.verificationStatus !== 'VERIFIED' && (
                      <button
                        onClick={() => handleUpdateVerification(w.id, 'VERIFIED')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors"
                      >
                        Approve KYC
                      </button>
                    )}

                    {w.verificationStatus !== 'REJECTED' && (
                      <button
                        onClick={() => handleUpdateVerification(w.id, 'REJECTED')}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-red-900/50 text-red-400 font-bold rounded-lg text-xs transition-colors"
                      >
                        Reject
                      </button>
                    )}
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
