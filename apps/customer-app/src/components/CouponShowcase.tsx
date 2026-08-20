import React, { useState, useEffect } from 'react';
import { Tag, Copy, Check, Gift, Clock } from 'lucide-react';
import { ApiClient } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export const CouponShowcase: React.FC = () => {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const { language } = useLanguage();

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const res = await ApiClient.request('/coupons');
        if (res.success && res.data) {
          setCoupons(res.data);
        }
      } catch (e) {
        console.error('Failed to load coupons:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCoupons();
  }, []);

  // Update clock every second for live countdown
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const formatRemainingTime = (expiresAt?: string | null) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - now;
    if (diff <= 0) return 'Expired';

    const totalHours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (totalHours >= 48) {
      const days = Math.floor(totalHours / 24);
      return `${days} days left`;
    } else if (totalHours >= 24) {
      const days = Math.floor(totalHours / 24);
      const remHours = totalHours % 24;
      return `${days}d ${remHours}h left`;
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(totalHours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  // Filter out expired coupons on the fly
  const activeCoupons = coupons.filter((c) => {
    if (!c.expiresAt) return true;
    return new Date(c.expiresAt).getTime() > now;
  });

  if (isLoading || activeCoupons.length === 0) return null;

  const isHindi = language === 'hi';

  return (
    <section className="space-y-2.5">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <Gift className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <h2 className="text-sm font-black text-gray-900 flex items-center space-x-1.5">
            <span>{isHindi ? 'ऑफ़र और कूपन' : 'Offers & Promo Codes'}</span>
            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-full">
              {activeCoupons.length}
            </span>
          </h2>
        </div>
        <span className="text-[11px] text-gray-400">
          {isHindi ? 'कॉपी करने के लिए टैप करें' : 'Tap to copy code'}
        </span>
      </div>

      {/* Ultra-Compact Minimal Coupon Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
        {activeCoupons.map((coupon) => {
          const isCopied = copiedCode === coupon.code;
          const isPercent = coupon.discountType === 'PERCENTAGE';
          const timerString = formatRemainingTime(coupon.expiresAt);

          return (
            <div
              key={coupon.id}
              onClick={() => handleCopy(coupon.code)}
              className="bg-white hover:bg-amber-50/40 rounded-2xl p-2.5 border border-amber-200 shadow-sm hover:shadow transition-all relative overflow-hidden flex flex-col justify-between space-y-1.5 cursor-pointer group"
            >
              {/* Mini Ticket Notches */}
              <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-slate-50 rounded-full border-l border-amber-200" />
              <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-slate-50 rounded-full border-r border-amber-200" />

              {/* Top Row: Discount Badge + Running Expiry Timer Badge */}
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black uppercase text-amber-700 bg-amber-100/90 px-1.5 py-0.5 rounded-md">
                  {isPercent ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`}
                </span>

                {timerString ? (
                  <span className="text-[9px] font-bold font-mono text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded-md flex items-center space-x-1 animate-pulse">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{timerString}</span>
                  </span>
                ) : (
                  <Tag className="w-3 h-3 text-amber-500 opacity-70" />
                )}
              </div>

              {/* Discount Headline */}
              <div>
                <h3 className="text-xs font-black text-gray-900 tracking-tight leading-tight">
                  {isPercent
                    ? `Save up to ₹${coupon.maxDiscount || Math.round(coupon.discountValue * 5)}`
                    : `Flat ₹${coupon.discountValue} Off`}
                </h3>
                <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                  Min ₹{coupon.minOrderValue} {coupon.maxDiscount ? `• Cap ₹${coupon.maxDiscount}` : ''}
                </p>
              </div>

              {/* Bottom Row: Code Box + Copy Feedback */}
              <div className="flex items-center justify-between pt-1 border-t border-dashed border-amber-200/80">
                <span className="font-mono font-black text-[11px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 tracking-wider">
                  {coupon.code}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(coupon.code);
                  }}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center space-x-1 transition-all ${
                    isCopied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white text-slate-700'
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-2.5 h-2.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
