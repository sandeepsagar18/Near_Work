import React, { useState, useEffect } from 'react';
import { Headphones, Plus, MessageSquare, CheckCircle, Clock } from 'lucide-react';
import { ApiClient } from '../services/api';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';

export const SupportPage: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [category, setCategory] = useState('SERVICE');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    if (user) fetchTickets();
  }, [user]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await ApiClient.request('/tickets', {
        method: 'POST',
        body: JSON.stringify({ category, subject, description })
      });
      if (res.success) {
        setShowModal(false);
        setSubject('');
        setDescription('');
        fetchTickets();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 bg-slate-50">
      <Header />

      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Customer Support</h2>
            <p className="text-xs text-gray-500">We are here to resolve any service or payment disputes</p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-3.5 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 flex items-center space-x-1 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Ticket</span>
          </button>
        </div>

        {tickets.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center space-y-2">
            <Headphones className="w-10 h-10 text-gray-300 mx-auto" />
            <h3 className="font-bold text-sm text-gray-800">No Open Tickets</h3>
            <p className="text-xs text-gray-400">Everything is in order! If you have any questions, raise a ticket.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <div key={t.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">{t.ticketNumber}</span>
                    <h4 className="font-bold text-sm text-gray-900">{t.subject}</h4>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    t.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {t.status}
                  </span>
                </div>

                <p className="text-xs text-gray-600">{t.description}</p>

                {t.adminNotes && (
                  <div className="bg-indigo-50 p-2.5 rounded-xl text-xs text-indigo-900 border border-indigo-100">
                    <span className="font-bold block text-[10px] uppercase text-indigo-600">Admin Resolution</span>
                    {t.adminNotes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* New Ticket Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3 animate-in zoom-in-95">
            <h3 className="font-bold text-sm text-gray-900">Raise a Support Ticket</h3>

            <form onSubmit={handleCreateTicket} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">Issue Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                >
                  <option value="PAYMENT">Payment / Refund Issue</option>
                  <option value="WORKER">Worker Conduct / Delay</option>
                  <option value="SERVICE">Service Quality Issue</option>
                  <option value="CANCELLATION">Cancellation Query</option>
                  <option value="OTHER">Other Query</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. AC cooling check delayed"
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">Description</label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide detailed information regarding the issue..."
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs h-20"
                ></textarea>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 border border-gray-300 font-bold text-xs rounded-xl text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
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
