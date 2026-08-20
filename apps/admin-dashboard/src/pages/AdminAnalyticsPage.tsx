import React, { useState, useEffect } from 'react';
import {
  Users,
  Briefcase,
  Calendar,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { AdminApiClient } from '../services/api';
import { AdminLayout } from '../components/AdminLayout';

export const AdminAnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await AdminApiClient.request('/admin/analytics');
        if (res.success && res.data) {
          setAnalytics(res.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const cards = [
    {
      title: 'Total Platform Revenue',
      value: `₹${analytics?.totalRevenue || 0}`,
      icon: <DollarSign className="w-5 h-5 text-emerald-400" />,
      sub: 'Gross Booking Volume'
    },
    {
      title: 'Platform Commission (20%)',
      value: `₹${analytics?.platformCommission || 0}`,
      icon: <TrendingUp className="w-5 h-5 text-blue-400" />,
      sub: 'Net Platform Take'
    },
    {
      title: 'Active Registered Customers',
      value: analytics?.totalUsers || 0,
      icon: <Users className="w-5 h-5 text-purple-400" />,
      sub: 'Verified Customers'
    },
    {
      title: 'Active / Total Workers',
      value: `${analytics?.activeWorkers || 0} / ${analytics?.totalWorkers || 0}`,
      icon: <Briefcase className="w-5 h-5 text-amber-400" />,
      sub: `${analytics?.pendingVerifications || 0} Pending KYC`
    },
    {
      title: 'Total Bookings Created',
      value: analytics?.totalBookings || 0,
      icon: <Calendar className="w-5 h-5 text-cyan-400" />,
      sub: `${analytics?.completedBookings || 0} Completed`
    },
    {
      title: 'Fulfilled & Settled',
      value: `${analytics?.completedBookings || 0}`,
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
      sub: '100% Guaranteed Services'
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-black text-white">Platform Performance Analytics</h1>
          <p className="text-xs text-slate-400">
            Real-time financial metrics, worker supply velocity & booking throughput
          </p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-3 gap-4">
          {cards.map((card, idx) => (
            <div
              key={idx}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-2 hover:border-slate-700 transition-colors"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400">{card.title}</span>
                <div className="p-2 rounded-xl bg-slate-800">{card.icon}</div>
              </div>
              <div className="text-2xl font-black text-white">{card.value}</div>
              <span className="text-[11px] text-slate-500 block">{card.sub}</span>
            </div>
          ))}
        </div>

        {/* Operational Highlights */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="font-bold text-sm text-white flex items-center">
              <ShieldCheck className="w-4 h-4 mr-2 text-emerald-400" />
              Platform Commission Rules
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Standard platform take rate is fixed at <strong>20%</strong> deducted atomically upon service completion.
              Workers receive <strong>80%</strong> net payout directly into their withdrawable ledger.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="font-bold text-sm text-white flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 text-amber-400" />
              KYC Compliance Action Required
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              There are currently <strong>{analytics?.pendingVerifications || 0} worker application(s)</strong> awaiting KYC document audit.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
