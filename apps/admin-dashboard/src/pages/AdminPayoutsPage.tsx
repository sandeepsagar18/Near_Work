import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { AdminApiClient } from '../services/api';
import { Wallet, Check, AlertCircle } from 'lucide-react';

export const AdminPayoutsPage: React.FC = () => {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [msg, setMsg] = useState('');

  const fetchPayouts = async () => {
    try {
      const res = await AdminApiClient.request('/admin/payouts');
      if (res.success && res.data) {
        setPayouts(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  const handleProcess = async (id: string, status: string) => {
    try {
      const res = await AdminApiClient.request(`/admin/payouts/${id}/process`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          referenceId: `UTR${Date.now()}`
        })
      });

      if (res.success) {
        setMsg(`Payout marked as ${status}`);
        fetchPayouts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-black text-white">Worker Wallet Payouts & Disbursal</h1>
          <p className="text-xs text-slate-400">
            Process bank transfers for worker completed service earnings
          </p>
        </div>

        {msg && (
          <div className="bg-emerald-950 border border-emerald-500 text-emerald-300 p-3 rounded-2xl text-xs">
            {msg}
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4">Payout # / Date</th>
                <th className="p-4">Worker Partner</th>
                <th className="p-4">Bank Details</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {payouts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4">
                    <strong className="block text-white text-xs">{p.payoutNumber}</strong>
                    <span className="text-[10px] text-slate-400">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </span>
                  </td>

                  <td className="p-4">
                    <strong className="block text-white">{p.worker?.user?.name}</strong>
                    <span className="text-[10px] text-slate-400">{p.worker?.user?.phone}</span>
                  </td>

                  <td className="p-4 text-[11px] text-slate-300">
                    <div>A/C: <strong className="text-white">{p.bankAccount}</strong></div>
                    <div className="text-slate-400">IFSC: {p.bankIfsc}</div>
                  </td>

                  <td className="p-4">
                    <span className="text-sm font-black text-emerald-400">₹{p.amount}</span>
                  </td>

                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        p.status === 'COMPLETED'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>

                  <td className="p-4 text-right">
                    {p.status === 'PENDING' && (
                      <button
                        onClick={() => handleProcess(p.id, 'COMPLETED')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs"
                      >
                        Mark Disbursed
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
