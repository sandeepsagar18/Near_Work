import React, { useState, useEffect } from 'react';
import { Headphones, Plus, MessageSquare, CheckCircle, Clock, AlertCircle, Phone, Mail, ChevronRight, HelpCircle } from 'lucide-react';
import { ApiClient } from '../services/api';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';

export const SupportPage: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [category, setCategory] = useState('SERVICE');
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchTickets = async () => {
    try {
      const res = await ApiClient.request('/tickets/my');
      if (res.success && res.data) {
        setTickets(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await ApiClient.request('/customer/bookings');
      if (res.success && res.data) {
        setBookings(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTickets();
      fetchBookings();
    }
  }, [user]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      const payload: any = {
        category,
        subject: subject.trim(),
        description: description.trim()
      };
      if (selectedBookingId) {
        payload.bookingId = selectedBookingId;
      }

      const res = await ApiClient.request('/tickets', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.success) {
        setSuccessMsg('Support ticket raised successfully! Our support officer will review it shortly.');
        setShowModal(false);
        setSubject('');
        setDescription('');
        setSelectedBookingId('');
        fetchTickets();
      } else {
        setErrorMsg(res.message || 'Failed to submit ticket. Please check your inputs.');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Network error while submitting support ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 bg-slate-50">
      <Header />

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Support Banner & Quick Action */}
        <div className="bg-gradient-to-r from-indigo-900 to-indigo-700 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <Headphones className="w-4 h-4" />
              24/7 Dedicated Help Center
            </span>
            <h2 className="text-xl sm:text-2xl font-black">How can we help you today?</h2>
            <p className="text-xs text-indigo-200">
              Raise a ticket for service quality, delayed technicians, refunds, or payment queries.
            </p>
          </div>

          <button
            onClick={() => {
              setErrorMsg('');
              setShowModal(true);
            }}
            className="px-5 py-3 bg-yellow-400 hover:bg-yellow-300 text-indigo-950 font-black text-xs sm:text-sm rounded-2xl flex items-center space-x-2 shadow-lg shadow-yellow-400/30 whitespace-nowrap transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Raise Ticket</span>
          </button>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-bold">{successMsg}</span>
          </div>
        )}

        {/* Quick Contact Helplines */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <a
            href="tel:1800123456"
            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:border-indigo-200 transition flex items-center space-x-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Toll-Free Helpline</span>
              <span className="text-xs font-bold text-gray-900">1800-NEARWORK</span>
            </div>
          </a>

          <a
            href="mailto:support@nearwork.com"
            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:border-indigo-200 transition flex items-center space-x-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Email Support</span>
              <span className="text-xs font-bold text-gray-900">help@nearwork.com</span>
            </div>
          </a>

          <div className="col-span-2 sm:col-span-1 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Average Response</span>
              <span className="text-xs font-bold text-gray-900">&lt; 15 Minutes</span>
            </div>
          </div>
        </div>

        {/* Tickets List */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-black text-base text-gray-900">Your Support Tickets</h3>
            <span className="text-xs font-bold text-gray-500">{tickets.length} total</span>
          </div>

          {tickets.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-gray-100 text-center space-y-3 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <HelpCircle className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-base text-gray-900">No Support Tickets Raised Yet</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Need help with a technician arrival, refund request, or invoice discrepancy? Click <strong>"Raise Ticket"</strong> to get instant assistance.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => (
                <div key={t.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3 hover:shadow-md transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] text-indigo-600 font-mono font-bold">{t.ticketNumber}</span>
                        <span className="text-[10px] bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded-md uppercase">
                          {t.category}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-gray-900 mt-1">{t.subject}</h4>
                    </div>

                    <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${
                      t.status === 'RESOLVED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : t.status === 'IN_PROGRESS'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {t.status}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-gray-100">
                    {t.description}
                  </p>

                  {t.booking && (
                    <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
                      <span className="font-bold text-gray-700">Linked Service:</span>
                      <span>{t.booking.service?.name || 'Home Service'}</span>
                      <span>({t.booking.bookingNumber})</span>
                    </div>
                  )}

                  {t.adminNotes && (
                    <div className="bg-indigo-50/80 p-3.5 rounded-2xl text-xs text-indigo-950 border border-indigo-100 space-y-1">
                      <span className="font-black block text-[10px] uppercase text-indigo-700">Official Support Resolution:</span>
                      <p className="text-xs text-indigo-900">{t.adminNotes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* New Ticket Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-black text-base text-gray-900">Raise Support Ticket</h3>
                <p className="text-xs text-gray-500">Our customer team will respond within 15 minutes</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateTicket} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Issue Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="SERVICE">Service Quality & Inspection</option>
                  <option value="PAYMENT">Payment, Billing & Invoice</option>
                  <option value="REFUND">Refund Request</option>
                  <option value="WORKER">Worker Conduct & Delay</option>
                  <option value="CANCELLATION">Booking Cancellation Dispute</option>
                  <option value="OTHER">General Feedback & Other</option>
                </select>
              </div>

              {bookings.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Related Booking (Optional)</label>
                  <select
                    value={selectedBookingId}
                    onChange={(e) => setSelectedBookingId(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="">-- No specific booking linked --</option>
                    {bookings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.service?.name} ({b.bookingNumber}) - ₹{b.totalAmount}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Technician arrived late or AC cooling issue"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Detailed Description</label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain what happened so our operations team can resolve it..."
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs h-24 focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none"
                ></textarea>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border border-gray-200 font-bold text-xs rounded-2xl text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-indigo-600 text-white font-black text-xs rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting Ticket...' : 'Submit Support Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};
