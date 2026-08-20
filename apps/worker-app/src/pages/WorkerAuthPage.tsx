import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Mail, Lock, User, Phone, ArrowRight, ShieldCheck, MapPin } from 'lucide-react';
import { useWorkerAuth } from '../context/WorkerAuthContext';
import { WorkerApiClient } from '../services/api';

export const WorkerAuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, register } = useWorkerAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('worker1@nearwork.com');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('Raj Kumar');
  const [phone, setPhone] = useState('9876543212');
  const [address, setAddress] = useState('Mohaddipur, Gorakhpur, UP');
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCatId, setSelectedCatId] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await fetch('/api/v1/services/categories');
        const data = await res.json();
        if (data.success && data.data) {
          setCategories(data.data);
          if (data.data.length > 0) setSelectedCatId(data.data[0].id);
        }
      } catch (e) {}
    };
    fetchCats();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        const success = await login(email, password);
        if (success) {
          navigate('/');
        } else {
          setError('Invalid credentials or unauthorized worker role');
        }
      } else {
        const success = await register({
          name,
          email,
          phone,
          password,
          address,
          categoryIds: [selectedCatId],
          experienceYears: 4,
          workingRadiusKm: 15,
          latitude: 26.765,
          longitude: 83.38,
          idProofType: 'Aadhaar Card',
          idProofUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600',
          bankAccountNumber: '98765432101234',
          bankIfsc: 'HDFC0001234'
        });

        if (success) {
          navigate('/');
        } else {
          setError('Registration failed. Please check your details.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white">
      <div className="bg-slate-900 max-w-sm w-full rounded-3xl p-6 shadow-2xl border border-slate-800 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <Wrench className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-white">NearWork Partner</h2>
          <p className="text-xs text-slate-400">Worker Operational & Job Portal</p>
        </div>

        {/* Toggle */}
        <div className="flex bg-slate-800 p-1 rounded-xl text-xs font-bold text-slate-400">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 rounded-lg transition-all ${
              isLogin ? 'bg-emerald-500 text-slate-950 shadow-md font-black' : ''
            }`}
          >
            Partner Sign In
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 rounded-lg transition-all ${
              !isLogin ? 'bg-emerald-500 text-slate-950 shadow-md font-black' : ''
            }`}
          >
            Join as Partner
          </button>
        </div>

        {error && (
          <div className="bg-red-950 text-red-300 p-3 rounded-xl text-xs border border-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {!isLogin && (
            <>
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Primary Skill</label>
                <select
                  value={selectedCatId}
                  onChange={(e) => setSelectedCatId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Operating Base Address</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/30 flex items-center justify-center space-x-2 transition-all mt-4"
          >
            <span>{isLoading ? 'Please wait...' : isLogin ? 'Access Partner Portal' : 'Register with KYC'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="bg-slate-800/80 p-3 rounded-xl text-[11px] text-slate-400 text-center space-y-1">
          <p className="font-semibold text-slate-200">Demo Verified Worker Credentials</p>
          <p>Email: <code className="bg-slate-900 px-1 rounded text-emerald-400">worker1@nearwork.com</code></p>
          <p>Password: <code className="bg-slate-900 px-1 rounded text-emerald-400">password123</code></p>
        </div>
      </div>
    </div>
  );
};
