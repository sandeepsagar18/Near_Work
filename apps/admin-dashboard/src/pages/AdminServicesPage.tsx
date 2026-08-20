import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { AdminApiClient } from '../services/api';
import { Layers, Plus, Clock, Tag } from 'lucide-react';

export const AdminServicesPage: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [categoryId, setCategoryId] = useState('');

  const fetchData = async () => {
    try {
      const [catRes, srvRes] = await Promise.all([
        fetch('/api/v1/services/categories').then((r) => r.json()),
        fetch('/api/v1/services').then((r) => r.json())
      ]);

      if (catRes.success) {
        setCategories(catRes.data);
        if (catRes.data.length > 0) setCategoryId(catRes.data[0].id);
      }
      if (srvRes.success) setServices(srvRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await AdminApiClient.request('/admin/services', {
        method: 'POST',
        body: JSON.stringify({
          categoryId,
          name,
          slug: slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          description,
          basePrice,
          durationMinutes
        })
      });

      if (res.success) {
        setShowAddModal(false);
        setName('');
        setSlug('');
        setDescription('');
        setBasePrice('');
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black text-white">Services & Pricing Catalog</h1>
            <p className="text-xs text-slate-400">
              Configure home service offerings, duration estimates & base customer pricing
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-md shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Service</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {services.map((s) => (
            <div
              key={s.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 hover:border-slate-700 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">
                    {s.category?.name}
                  </span>
                  <h3 className="font-bold text-sm text-white">{s.name}</h3>
                </div>
                <span className="text-base font-black text-emerald-400">₹{s.basePrice}</span>
              </div>

              <p className="text-xs text-slate-400 line-clamp-2">{s.description}</p>

              <div className="flex items-center text-[11px] text-slate-500 pt-2 border-t border-slate-800">
                <Clock className="w-3.5 h-3.5 mr-1" />
                <span>{s.durationMinutes} mins standard duration</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-3 text-white">
            <h3 className="font-bold text-sm text-white">Add Home Service Offering</h3>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Service Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Inverter Repair"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Base Price (₹)</label>
                <input
                  type="number"
                  required
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="399"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Duration (Mins)</label>
                <input
                  type="number"
                  required
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="60"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Description</label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Service description and guarantee..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs h-16"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="py-2.5 bg-slate-800 font-bold text-xs rounded-xl text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl"
                >
                  Create Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
