import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Mail, Lock, User, Phone, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('customer@nearwork.com');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('Sandeep Sharma');
  const [phone, setPhone] = useState('9876543211');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        const result = await login(email, password);
        if (result.success) {
          navigate('/');
        } else {
          setError(result.message || 'Invalid email or password');
        }
      } else {
        const result = await register({ name, email, phone, password });
        if (result.success) {
          navigate('/');
        } else {
          setError(result.message || 'Registration failed. Please check inputs.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-sm w-full rounded-3xl p-6 shadow-xl border border-gray-100 space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/30 text-white font-black text-xl">
            NW
          </div>
          <h2 className="text-xl font-black text-gray-900">NearWork</h2>
          <p className="text-xs text-gray-500">Fast, verified home services at your doorstep</p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-bold text-gray-600">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 rounded-lg transition-all ${
              isLogin ? 'bg-white text-indigo-600 shadow-sm' : ''
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 rounded-lg transition-all ${
              !isLogin ? 'bg-white text-indigo-600 shadow-sm' : ''
            }`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {!isLogin && (
            <>
              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Sandeep Sharma"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="9876543211"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-[11px] font-bold text-gray-700 block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="customer@nearwork.com"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-700 block mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all mt-4"
          >
            <span>{isLoading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="bg-slate-50 p-3 rounded-xl text-[11px] text-gray-500 text-center space-y-1">
          <p className="font-semibold text-gray-700">Demo Customer Credentials</p>
          <p>Email: <code className="bg-white px-1 rounded">customer@nearwork.com</code></p>
          <p>Password: <code className="bg-white px-1 rounded">password123</code></p>
        </div>
      </div>
    </div>
  );
};
