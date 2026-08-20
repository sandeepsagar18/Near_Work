import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Tag,
  ShieldCheck,
  CreditCard,
  Banknote,
  Check,
  AlertCircle,
  Plus,
  Sparkles,
  Loader2
} from 'lucide-react';
import { ApiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { AddressModal } from '../components/AddressModal';

export const BookingConfirmationPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, selectedAddress, setSelectedAddress } = useAuth();
  const { t } = useLanguage();
  const state = location.state as any;

  const [paymentMode, setPaymentMode] = useState<'ONLINE' | 'CASH'>('CASH');
  const [couponCode, setCouponCode] = useState('WELCOME50');
  const [appliedCoupon, setAppliedCoupon] = useState<any>({
    code: 'WELCOME50',
    discount: Math.round((state?.basePrice || 499) * 0.5 > 150 ? 150 : (state?.basePrice || 499) * 0.5)
  });
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [couponError, setCouponError] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Fallback default date & slot
  const defaultDate = new Date().toISOString().split('T')[0];
  const scheduledDate = state?.scheduledDate || defaultDate;
  const scheduledTimeSlot = state?.scheduledTimeSlot || '10:00 AM';

  // Load available coupons from backend
  useEffect(() => {
    const fetchAvailableCoupons = async () => {
      try {
        const res = await ApiClient.request('/coupons');
        if (res.success && res.data) {
          setAvailableCoupons(res.data);
        }
      } catch (e) {
        console.warn('Failed to load coupons:', e);
      }
    };
    fetchAvailableCoupons();
  }, []);

  // Ensure address is loaded on mount
  useEffect(() => {
    const ensureAddress = async () => {
      if (!selectedAddress) {
        try {
          const res = await ApiClient.request('/customer/addresses');
          if (res.success && res.data && res.data.length > 0) {
            setSelectedAddress(res.data[0]);
          } else {
            // Auto create default address
            const newAddr = await ApiClient.request('/customer/addresses', {
              method: 'POST',
              body: JSON.stringify({
                label: 'Home',
                addressLine: 'Flat 402, Royal Palms Apartment, Civil Lines',
                city: 'Gorakhpur',
                state: 'Uttar Pradesh',
                pincode: '273001',
                latitude: 26.7606,
                longitude: 83.3732,
                isDefault: true
              })
            });
            if (newAddr.success && newAddr.data) {
              setSelectedAddress(newAddr.data);
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
    };
    if (user) ensureAddress();
  }, [user, selectedAddress, setSelectedAddress]);

  if (!state || !state.serviceId) {
    navigate('/services');
    return null;
  }

  const basePrice = state.basePrice || 499;
  const visitCharge = 50;
  const discount = appliedCoupon ? appliedCoupon.discount : 0;
  const subtotal = Math.max(50, basePrice + visitCharge - discount);
  const tax = Math.round((subtotal * 18) / 100);
  const totalAmount = subtotal + tax;

  const handleApplyCoupon = async (codeToApply?: string) => {
    const targetCode = (codeToApply || couponCode).trim().toUpperCase();
    if (!targetCode) return;

    setCouponError('');
    setIsValidatingCoupon(true);

    try {
      const res = await ApiClient.request('/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({
          code: targetCode,
          amount: basePrice
        })
      });

      if (res.success && res.data) {
        setCouponCode(targetCode);
        setAppliedCoupon({
          code: targetCode,
          discount: res.data.discount
        });
      } else {
        setAppliedCoupon(null);
        setCouponError(res.message || 'Invalid or expired coupon code');
      }
    } catch (err: any) {
      setAppliedCoupon(null);
      setCouponError(err.message || 'Failed to validate coupon');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const handleConfirmAndPay = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setIsSubmitting(true);
    setPaymentError('');

    let activeAddress = selectedAddress;

    // Auto-fetch or create/persist default address if not set or if it's an ephemeral GPS ID
    if (!activeAddress || !activeAddress.id || String(activeAddress.id).startsWith('gps-live')) {
      try {
        const addrList = await ApiClient.request('/customer/addresses');
        if (addrList.success && addrList.data && addrList.data.length > 0) {
          activeAddress = addrList.data[0];
          setSelectedAddress(activeAddress);
        } else {
          const newAddrRes = await ApiClient.request('/customer/addresses', {
            method: 'POST',
            body: JSON.stringify({
              label: 'Home',
              addressLine: activeAddress?.addressLine || 'Hostel Road, Civil Lines',
              city: activeAddress?.city || 'Gorakhpur',
              state: activeAddress?.state || 'Uttar Pradesh',
              pincode: activeAddress?.pincode || '273001',
              latitude: activeAddress?.latitude || 26.7606,
              longitude: activeAddress?.longitude || 83.3732,
              isDefault: true
            })
          });
          if (newAddrRes.success && newAddrRes.data) {
            activeAddress = newAddrRes.data;
            setSelectedAddress(activeAddress);
          }
        }
      } catch (e) {
        console.error('Failed to persist address:', e);
      }
    }

    if (!activeAddress?.id || String(activeAddress.id).startsWith('gps-live')) {
      setIsSubmitting(false);
      setShowAddressModal(true);
      return;
    }

    try {
      // 1. Create Booking in PAYMENT_PENDING state
      const bookingRes = await ApiClient.request('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          serviceId: state.serviceId,
          addressId: activeAddress.id,
          scheduledDate,
          scheduledTimeSlot,
          instructions: state.instructions || '',
          couponCode: appliedCoupon?.code
        })
      });

      if (!bookingRes.success || !bookingRes.data) {
        throw new Error(bookingRes.message || 'Failed to initialize booking');
      }

      const booking = bookingRes.data;

      // 2. Handle Payment Selection
      if (paymentMode === 'CASH') {
        // Cash on Delivery / Pay after service
        const cashRes = await ApiClient.request('/payments/cash', {
          method: 'POST',
          body: JSON.stringify({ bookingId: booking.id })
        });

        if (cashRes.success) {
          navigate(`/booking/${booking.id}/track`);
        } else {
          throw new Error(cashRes.message || 'Failed to confirm cash booking');
        }
      } else {
        // Online Payment via Razorpay
        const orderRes = await ApiClient.request('/payments/order', {
          method: 'POST',
          body: JSON.stringify({ bookingId: booking.id })
        });

        if (!orderRes.success || !orderRes.data) {
          throw new Error(orderRes.message || 'Failed to initialize payment gateway');
        }

        const orderData = orderRes.data;
        const mockPaymentId = `pay_${Date.now()}`;
        const mockSignature = `sig_${Date.now()}`;

        const verifyRes = await ApiClient.request('/payments/verify', {
          method: 'POST',
          body: JSON.stringify({
            bookingId: booking.id,
            razorpayOrderId: orderData.orderId,
            razorpayPaymentId: mockPaymentId,
            razorpaySignature: mockSignature,
            paymentMethod: 'UPI'
          })
        });

        if (verifyRes.success) {
          navigate(`/booking/${booking.id}/track`);
        } else {
          throw new Error(verifyRes.message || 'Payment verification failed');
        }
      }
    } catch (err: any) {
      console.error('Booking confirmation error:', err);
      setPaymentError(err.message || 'An error occurred during booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pb-28 bg-slate-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center space-x-2 mb-6 text-xs text-gray-500">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 transition-colors flex items-center space-x-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-bold">Back</span>
          </button>
          <span>/</span>
          <span>Checkout</span>
          <span>/</span>
          <span className="text-gray-900 font-bold">Review & Pay</span>
        </div>

        {paymentError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center space-x-3 text-red-800 text-xs sm:text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <span>{paymentError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Summary, Address & Payment Mode Selector */}
          <div className="lg:col-span-7 space-y-6">
            {/* Service & Schedule Overview */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Service Appointment Summary</h2>

              <div className="p-4 bg-slate-50 rounded-2xl border border-gray-100 flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-base text-gray-900">{state.serviceName}</h3>
                  <div className="flex items-center space-x-4 text-xs text-gray-600 mt-2">
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      <span>{scheduledDate}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      <span>{scheduledTimeSlot}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-gray-400 block font-medium">Base Price</span>
                  <span className="text-lg font-bold text-gray-900">₹{basePrice}</span>
                </div>
              </div>
            </div>

            {/* Service Address Selection Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-gray-900 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-indigo-600" />
                  Service Location Address
                </h3>
                <button
                  onClick={() => setShowAddressModal(true)}
                  className="text-xs font-bold text-indigo-600 hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{selectedAddress ? 'Change Address' : 'Add Address'}</span>
                </button>
              </div>

              {selectedAddress ? (
                <div className="p-4 bg-slate-50 rounded-2xl border border-gray-100 flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase">
                      {selectedAddress.label || 'Home'}
                    </span>
                    <p className="text-xs sm:text-sm font-semibold text-gray-900 pt-1">
                      {selectedAddress.addressLine}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode}
                    </p>
                  </div>
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                </div>
              ) : (
                <div
                  onClick={() => setShowAddressModal(true)}
                  className="p-6 border-2 border-dashed border-gray-200 hover:border-indigo-400 rounded-2xl text-center cursor-pointer space-y-2 transition-colors"
                >
                  <MapPin className="w-6 h-6 text-gray-400 mx-auto" />
                  <p className="text-xs font-bold text-gray-700">Click to select or enter your address</p>
                </div>
              )}
            </div>

            {/* Payment Method Selector */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-gray-900">Select Payment Mode</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Cash / Pay After Service Option */}
                <div
                  onClick={() => setPaymentMode('CASH')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all space-y-2 ${
                    paymentMode === 'CASH'
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-md'
                      : 'border-gray-100 hover:border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      <Banknote className="w-6 h-6" />
                    </div>
                    {paymentMode === 'CASH' && (
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-gray-900">Pay After Service</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Pay with Cash or partner's UPI QR code only after service completion.
                  </p>
                </div>

                {/* Online Payment (Razorpay) Option */}
                <div
                  onClick={() => setPaymentMode('ONLINE')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all space-y-2 ${
                    paymentMode === 'ONLINE'
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-md'
                      : 'border-gray-100 hover:border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    {paymentMode === 'ONLINE' && (
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-gray-900">Pay Online (Razorpay)</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Instant confirmation with UPI (GPay, PhonePe), Cards & NetBanking.
                  </p>
                </div>
              </div>
            </div>

            {/* Coupons & Promo Codes */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-gray-900 flex items-center">
                  <Tag className="w-4 h-4 mr-2 text-indigo-600" />
                  {t('checkout.apply_coupon', 'Apply Coupon Code')}
                </h3>
                {appliedCoupon && (
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-xs font-bold text-red-600 hover:underline"
                  >
                    Remove Coupon
                  </button>
                )}
              </div>

              {/* Coupon Input Box */}
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code..."
                  className="flex-1 px-4 py-3 bg-slate-50 border border-gray-200 rounded-2xl text-xs sm:text-sm font-mono font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => handleApplyCoupon()}
                  disabled={isValidatingCoupon || !couponCode.trim()}
                  className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs rounded-2xl shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {isValidatingCoupon ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>{t('checkout.apply_btn', 'Apply')}</span>
                  )}
                </button>
              </div>

              {couponError && (
                <p className="text-xs text-red-500 font-semibold flex items-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{couponError}</span>
                </p>
              )}

              {appliedCoupon && (
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl p-3.5 text-xs sm:text-sm flex items-center justify-between shadow-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <span>
                      Coupon <strong className="font-mono">{appliedCoupon.code}</strong> applied successfully!
                    </span>
                  </div>
                  <span className="font-black text-base text-emerald-700">-₹{appliedCoupon.discount}</span>
                </div>
              )}

              {/* Active Admin Coupons List */}
              {availableCoupons.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-gray-100">
                  <span className="text-xs font-bold text-gray-500 block uppercase tracking-wider">
                    Available Special Offers:
                  </span>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {availableCoupons.map((c) => {
                      const isApplied = appliedCoupon?.code === c.code;
                      const isBelowMin = basePrice < c.minOrderValue;

                      return (
                        <div
                          key={c.id}
                          className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                            isApplied
                              ? 'bg-emerald-50/60 border-emerald-300 ring-2 ring-emerald-500/20'
                              : 'bg-slate-50/70 border-gray-200 hover:border-indigo-200'
                          }`}
                        >
                          <div className="space-y-0.5 min-w-0 pr-2">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-black text-xs px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-700 tracking-wider">
                                {c.code}
                              </span>
                              <span className="text-[11px] font-bold text-emerald-700">
                                {c.discountType === 'PERCENTAGE' ? `${c.discountValue}% OFF` : `₹${c.discountValue} FLAT OFF`}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-500 truncate">
                              Min. order ₹{c.minOrderValue} {c.maxDiscount ? `• Max discount ₹${c.maxDiscount}` : ''}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleApplyCoupon(c.code)}
                            disabled={isApplied || isValidatingCoupon || isBelowMin}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 cursor-pointer ${
                              isApplied
                                ? 'bg-emerald-600 text-white'
                                : isBelowMin
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-white hover:bg-indigo-600 hover:text-white text-indigo-600 border border-indigo-200 shadow-sm'
                            }`}
                          >
                            {isApplied ? 'Applied' : isBelowMin ? `Min ₹${c.minOrderValue}` : 'Apply'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Sticky Price Breakdown & Action */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xl space-y-6 sticky top-24">
              <h3 className="text-base font-bold text-gray-900 uppercase tracking-wider">
                Price Breakdown
              </h3>

              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Item Total ({state.serviceName})</span>
                  <span className="font-semibold text-gray-900">₹{basePrice}</span>
                </div>

                <div className="flex justify-between text-gray-600">
                  <span>Standard Visit & Diagnostic Fee</span>
                  <span className="font-semibold text-gray-900">₹{visitCharge}</span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Promo Discount ({appliedCoupon.code})</span>
                    <span>-₹{discount}</span>
                  </div>
                )}

                <div className="flex justify-between text-gray-600">
                  <span>GST & Service Tax (18%)</span>
                  <span className="font-semibold text-gray-900">₹{tax}</span>
                </div>

                <div className="border-t border-gray-200 pt-4 flex justify-between text-lg sm:text-xl font-black text-gray-900">
                  <span>{t('checkout.total_payable', 'Total Payable')}</span>
                  <span className="text-indigo-600">₹{totalAmount}</span>
                </div>
              </div>

              <button
                onClick={handleConfirmAndPay}
                disabled={isSubmitting}
                className={`w-full py-4 text-white font-black text-sm rounded-2xl shadow-xl flex items-center justify-center space-x-2 transition-transform active:scale-95 disabled:opacity-50 cursor-pointer ${
                  paymentMode === 'CASH'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t('checkout.processing', 'Booking Service & Dispatching Partner...')}</span>
                  </>
                ) : paymentMode === 'CASH' ? (
                  <>
                    <Banknote className="w-5 h-5" />
                    <span>{t('checkout.book_cash_btn', 'Book with Cash')} (₹{totalAmount})</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    <span>{t('checkout.pay_online_btn', 'Pay Online via Razorpay')} (₹{totalAmount})</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center space-x-2 text-[11px] text-gray-500 pt-2 border-t border-gray-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  {paymentMode === 'CASH'
                    ? 'Pay only after 100% service completion'
                    : 'Razorpay 256-bit SSL encryption • Free cancellation'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Bottom Confirm Bar for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-gray-200 lg:hidden z-30 flex items-center justify-between shadow-2xl">
        <div>
          <span className="text-[10px] text-gray-400 uppercase font-semibold block">{t('checkout.total_payable', 'Total Payable')}</span>
          <span className="text-xl font-black text-indigo-600">₹{totalAmount}</span>
        </div>
        <button
          onClick={handleConfirmAndPay}
          disabled={isSubmitting}
          className={`px-6 py-3 text-white font-black text-sm rounded-2xl shadow-lg flex items-center space-x-2 cursor-pointer ${
            paymentMode === 'CASH' ? 'bg-emerald-600' : 'bg-indigo-600'
          }`}
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <span>{paymentMode === 'CASH' ? t('checkout.book_cash_btn', 'Book with Cash') : t('checkout.pay_online_btn', 'Pay Online')}</span>
          )}
        </button>
      </div>

      <AddressModal isOpen={showAddressModal} onClose={() => setShowAddressModal(false)} />
      <BottomNav />
    </div>
  );
};
