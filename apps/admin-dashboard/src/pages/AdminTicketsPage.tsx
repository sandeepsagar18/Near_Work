import React, { useState, useEffect } from 'react';
import {
  Headphones,
  Search,
  CheckCircle2,
  Phone,
  Mail,
  Send
} from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { AdminApiClient } from '../services/api';

export const AdminTicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [newStatus, setNewStatus] = useState<string>('IN_PROGRESS');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [msg, setMsg] = useState<string>('');

  const fetchTickets = async () => {
    try {
      const res = await AdminApiClient.request('/tickets/all');
      if (res.success && res.data) {
        setTickets(res.data);
        if (selectedTicket) {
          const updated = res.data.find((t: any) => t.id === selectedTicket.id);
          if (updated) setSelectedTicket(updated);
        } else if (res.data.length > 0) {
          setSelectedTicket(res.data[0]);
          setAdminNotes(res.data[0].adminNotes || '');
          setNewStatus(res.data[0].status);
        }
      }
    } catch (e) {
      console.error('Failed to fetch tickets:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleSelectTicket = (t: any) => {
    setSelectedTicket(t);
    setAdminNotes(t.adminNotes || '');
    setNewStatus(t.status);
    setMsg('');
  };

  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    setIsUpdating(true);
    setMsg('');

    try {
      const res = await AdminApiClient.request(`/tickets/${selectedTicket.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: newStatus,
          adminNotes: adminNotes.trim()
        })
      });

      if (res.success) {
        setMsg('Ticket updated successfully! Customer notified.');
        fetchTickets();
      }
    } catch (e: any) {
      console.error(e);
      setMsg(e.message || 'Failed to update ticket');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesCategory = categoryFilter === 'ALL' || t.category === categoryFilter;
    const matchesSearch =
      t.ticketNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.user?.phone?.includes(searchQuery);
    return matchesStatus && matchesCategory && matchesSearch;
  });

  return (
    <AdminLayout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <Headphones className="w-6 h-6 text-blue-400" />
              Disputes & Customer Support Tickets
            </h1>
            <p className="text-xs text-slate-400">
              Review issues raised by customers, investigate linked bookings, and publish resolutions.
            </p>
          </div>

          <button
            onClick={fetchTickets}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl border border-slate-700 cursor-pointer"
          >
            Refresh ({tickets.length})
          </button>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ticket #, customer name, phone, or subject..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">🔴 Open</option>
            <option value="IN_PROGRESS">🟡 In Progress</option>
            <option value="RESOLVED">🟢 Resolved</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="SERVICE">Service Quality</option>
            <option value="PAYMENT">Payment / Invoice</option>
            <option value="REFUND">Refund</option>
            <option value="WORKER">Worker Conduct</option>
            <option value="CANCELLATION">Cancellation</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        {/* Main 2-Column Split: Ticket List & Ticket Detail Cockpit */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Tickets Queue */}
          <div className="lg:col-span-5 space-y-3 max-h-[750px] overflow-y-auto pr-1">
            {filteredTickets.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-500 text-xs">
                No tickets matching current filters.
              </div>
            ) : (
              filteredTickets.map((t) => {
                const isSelected = selectedTicket?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTicket(t)}
                    className={`p-4 rounded-2xl border transition cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/10'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-[11px] font-mono font-bold text-blue-400">{t.ticketNumber}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          t.status === 'RESOLVED'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : t.status === 'IN_PROGRESS'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-white line-clamp-1">{t.subject}</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2">{t.description}</p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
                      <span className="font-semibold text-slate-400">{t.user?.name || 'Customer'}</span>
                      <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">{t.category}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Selected Ticket Resolution Cockpit */}
          <div className="lg:col-span-7">
            {selectedTicket ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-800">
                        {selectedTicket.ticketNumber}
                      </span>
                      <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded-md uppercase">
                        {selectedTicket.category}
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-white mt-1">{selectedTicket.subject}</h3>
                    <span className="text-[11px] text-slate-500">
                      Created on {new Date(selectedTicket.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      selectedTicket.status === 'RESOLVED'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : selectedTicket.status === 'IN_PROGRESS'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}
                  >
                    {selectedTicket.status}
                  </span>
                </div>

                {/* Customer & Booking Details Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Customer Info</span>
                    <div className="font-bold text-slate-200">{selectedTicket.user?.name}</div>
                    <div className="text-slate-400 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-500" /> {selectedTicket.user?.phone}
                    </div>
                    <div className="text-slate-400 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-500" /> {selectedTicket.user?.email || 'N/A'}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Linked Booking</span>
                    {selectedTicket.booking ? (
                      <div>
                        <div className="font-bold text-blue-400">{selectedTicket.booking.bookingNumber}</div>
                        <div className="text-slate-300">{selectedTicket.booking.service?.name}</div>
                        <div className="text-slate-400">Status: {selectedTicket.booking.status}</div>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">No specific booking attached</span>
                    )}
                  </div>
                </div>

                {/* Customer Complaint Text */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Customer Complaint / Details:
                  </span>
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {selectedTicket.description}
                  </div>
                </div>

                {/* Status & Resolution Form */}
                <form onSubmit={handleUpdateTicket} className="space-y-4 pt-2 border-t border-slate-800">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Change Ticket Status:
                    </label>
                    <div className="flex gap-2">
                      {['OPEN', 'IN_PROGRESS', 'RESOLVED'].map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setNewStatus(st)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                            newStatus === st
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {st === 'RESOLVED' ? '✓ RESOLVED' : st}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Admin Resolution Note (Visible to Customer):
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="e.g. Verified with technician. Refund of ₹250 initiated to wallet, or replacement service scheduled."
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 resize-none"
                    ></textarea>
                  </div>

                  {msg && (
                    <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      <span>{msg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-2xl shadow-lg shadow-blue-600/30 transition cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isUpdating ? 'Publishing Resolution...' : 'Update Ticket & Publish Resolution'}</span>
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 text-xs">
                Select a ticket from the left queue to review and resolve.
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};