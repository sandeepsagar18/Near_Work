import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { AdminApiClient } from '../services/api';
import { Tag, Plus, Check, Percent, Trash2, Power, AlertCircle, RefreshCw, Clock, Flame } from 'lucide-react';

export const AdminCouponsPage: React.FC = () => {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrderValue, setMinOrderValue] = useState('199');
  const [maxDiscount, setMaxDiscount] = useState('150');
  const [usageLimit, setUsageLimit] = useState('500');
  const [expiryPreset, setExpiryPreset] = useState('24H'); // 1H, 6H, 24H, 3D, 7D, NEVER, CUSTOM
  const [customExpiry, setCustomExpiry] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const fetchCoupons = async () => {
    try {
      setIsLoading(true);
      const res = await AdminApiClient.request('/admin/coupons');
      if (res.success && res.data) {
        setCoupons(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  // Update live clock every second
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const calculateExpiresAt = (): string | null => {
    if (expiryPreset === 'NEVER') return null;
    if (expiryPreset === 'CUSTOM') return customExpiry ? new Date(customExpiry).toISOString() : null;

    const d = new Date();
    if (expiryPreset === '1H') d.setHours(d.getHours() + 1);
    else if (expiryPreset === '6H') d.setHours(d.getHours() + 6);
    else if (expiryPreset === '24H') d.setHours(d.getHours() + 24);
    else if (expiryPreset === '3D') d.setDate(d.getDate() + 3);
    else if (expiryPreset === '7D') d.setDate(d.getDate() + 7);
    return d.toISOString();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const expiresAt = calculateExpiresAt();

      const res = await AdminApiClient.request('/admin/coupons', {
        method: 'POST',
        body: JSON.stringify({
          code,
          discountType,
          discountValue,
          minOrderValue,
          maxDiscount,
          usageLimit,
          expiresAt
        })
      });

      if (res.success) {
        setShowAdd(false);
        setCode('');
        setDiscountValue('');
        setMinOrderValue('199');
        setMaxDiscount('150');
        setUsageLimit('500');
        setExpiryPreset('24H');
        setCustomExpiry('');
        fetchCoupons();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string, codeName: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete coupon "${codeName}"?`)) {
      return;
    }

    try {
      setIsDeleting(id);
      const res = await AdminApiClient.request(`/admin/coupons/${id}`, {
        method: 'DELETE'
      });

      if (res.success) {
        setCoupons((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (e) {
      console.error('Failed to delete coupon:', e);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await AdminApiClient.request(`/admin/coupons/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !currentStatus })
      });

      if (res.success) {
        setCoupons((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isActive: !currentStatus } : c))
        );
      }
    } catch (e) {
      console.error('Failed to toggle coupon status:', e);
    }
  };

  const formatCountdown = (expiresAt?: string | null) => {
    if (!expiresAt) return { text: 'No Expiry (Always Active)', isExpired: false, isUrgent: false };
    const diff = new Date(expiresAt).getTime() - now;
    if (diff <= 0) return { text: 'Expired', isExpired: true, isUrgent: false };

    const totalHours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const pad = (n: number) => String(n).padStart(2, '0');

    if (totalHours >= 24) {
      const days = Math.floor(totalHours / 24);
      const remHours = totalHours % 24;
      return { text: `${days}d ${remHours}h remaining`, isExpired: false, isUrgent: false };
    }

    return {
      text: `${pad(totalHours)}:${pad(minutes)}:${pad(seconds)} remaining`,
      isExpired: false,
      isUrgent: totalHours < 2
    };
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center space-x-2">
              <Tag className="w-6 h-6 text-indigo-400" />
              <span>Coupons & Promotional Offers</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Configure promo codes, duration & running timers, maximum usage caps & delete coupons
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchCoupons}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
              title="Refresh Coupons"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowAdd(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl flex items-center space-x-1.5 shadow-lg shadow-indigo-600/30 transition-transform active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Promo Coupon</span>
            </button>
          </div>
        </div>

        {/* Coupons Grid */}
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 text-xs">
            Loading promotional coupons...
          </div>
        ) : coupons.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-3">
            <Tag className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-white">No promotional coupons created yet.</p>
            <button
              onClick={() => setShowAdd(true)}
              className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Create First Coupon
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {coupons.map((c) => {
              const isPercent = c.discountType === 'PERCENTAGE';
              const percentUsed = Math.min(100, Math.round(((c.usedCount || 0) / (c.usageLimit || 1)) * 100));
              const isLimitReached = (c.usedCount || 0) >= (c.usageLimit || 1);
              const timer = formatCountdown(c.expiresAt);

              return (
                <div
                  key={c.id}
                  className={`bg-slate-900 border rounded-3xl p-5 space-y-4 relative overflow-hidden transition-all shadow-xl ${
                    !c.isActive || isLimitReached || timer.isExpired
                      ? 'border-slate-800 opacity-70'
                      : 'border-slate-800 hover:border-indigo-500/50'
                  }`}
                >
                  {/* Header Row */}
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-lg tracking-wider text-emerald-400 font-mono bg-emerald-950/70 px-3 py-1 rounded-xl border border-emerald-500/30">
                          {c.code}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            timer.isExpired
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : c.isActive && !isLimitReached
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-red-500/20 text-red-300 border border-red-500/30'
                          }`}
                        >
                          {timer.isExpired
                            ? 'Expired'
                            : c.isActive && !isLimitReached
                            ? 'Active'
                            : isLimitReached
                            ? 'Limit Reached'
                            : 'Inactive'}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-300 block mt-2">
                        {isPercent ? `${c.discountValue}% Discount` : `₹${c.discountValue} Flat Off`}
                      </span>
                    </div>

                    {/* Delete & Status Actions */}
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleToggleStatus(c.id, c.isActive)}
                        title={c.isActive ? 'Deactivate Coupon' : 'Activate Coupon'}
                        className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                          c.isActive
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30 hover:bg-emerald-900'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDelete(c.id, c.code)}
                        disabled={isDeleting === c.id}
                        title="Delete Coupon Permanently"
                        className="p-2 rounded-xl bg-red-950/60 text-red-400 border border-red-500/30 hover:bg-red-900 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Live Running Time / Expiry Section */}
                  <div
                    className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${
                      timer.isExpired
                        ? 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                        : timer.isUrgent
                        ? 'bg-amber-950/50 border-amber-500/40 text-amber-300 animate-pulse'
                        : 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      <span className="font-mono font-bold">{timer.text}</span>
                    </div>
                    {c.expiresAt && (
                      <span className="text-[10px] opacity-70">
                        {new Date(c.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  {/* Rules & Limits Info */}
                  <div className="space-y-1.5 text-xs text-slate-400 bg-slate-950/50 p-3.5 rounded-2xl border border-slate-800/80">
                    <div className="flex justify-between">
                      <span>Min Order Value:</span>
                      <strong className="text-white font-mono">₹{c.minOrderValue}</strong>
                    </div>
                    {c.maxDiscount && (
                      <div className="flex justify-between">
                        <span>Max Cap:</span>
                        <strong className="text-white font-mono">₹{c.maxDiscount}</strong>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Max Usage Limit:</span>
                      <strong className="text-emerald-400 font-mono">{c.usageLimit} times</strong>
                    </div>
                  </div>

                  {/* Usage Counter Bar */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-slate-400">Times Used</span>
                      <span className="text-indigo-400">
                        {c.usedCount || 0} / {c.usageLimit} ({c.usageLimit - (c.usedCount || 0)} left)
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          isLimitReached ? 'bg-red-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${percentUsed}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Create Promo Coupon */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 text-white shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <Tag className="w-5 h-5 text-indigo-400" />
                <span>Create New Promo Coupon</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Set discount rules, active running duration, usage limits and caps
              </p>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Coupon Code (Uppercase)</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. FLASH50, FESTIVE100"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs uppercase font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Discount Value</label>
                  <input
                    type="number"
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === 'PERCENTAGE' ? 'e.g. 50 (%)' : 'e.g. 100 (₹)'}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Min Order Value (₹)</label>
                  <input
                    type="number"
                    value={minOrderValue}
                    onChange={(e) => setMinOrderValue(e.target.value)}
                    placeholder="199"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Max Discount Cap (₹)</label>
                  <input
                    type="number"
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(e.target.value)}
                    placeholder="150"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Coupon Active Duration / Running Time */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>How long will this coupon be active? (Running Timer)</span>
                </label>

                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: '1H', label: '1 Hour (Flash)' },
                    { id: '6H', label: '6 Hours' },
                    { id: '24H', label: '24 Hours (1 Day)' },
                    { id: '3D', label: '3 Days' },
                    { id: '7D', label: '7 Days' },
                    { id: 'NEVER', label: 'No Expiry' }
                  ].map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setExpiryPreset(p.id)}
                      className={`py-2 px-2 text-[11px] font-bold rounded-xl border transition-all cursor-pointer ${
                        expiryPreset === p.id
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-750'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max Usage Limit */}
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  How many times coupon can be used (Max Usage Limit)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  placeholder="e.g. 100, 500, 1000"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="py-3 bg-slate-800 hover:bg-slate-700 font-bold text-xs rounded-xl text-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-transform active:scale-95 cursor-pointer"
                >
                  Save & Publish Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
