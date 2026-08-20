import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Wind,
  Disc,
  Sparkles,
  UtensilsCrossed,
  Droplets,
  Wrench,
  Tv,
  Search,
  Star,
  Clock,
  ShieldCheck,
  Tag,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { ApiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { LiveLocationWidget } from '../components/LiveLocationWidget';
import { CouponShowcase } from '../components/CouponShowcase';
import { AddressModal } from '../components/AddressModal';

const iconMap: Record<string, React.ReactNode> = {
  Zap: <Zap className="w-6 h-6 text-amber-500" />,
  Wind: <Wind className="w-6 h-6 text-sky-500" />,
  Disc: <Disc className="w-6 h-6 text-indigo-500" />,
  Sparkles: <Sparkles className="w-6 h-6 text-purple-500" />,
  UtensilsCrossed: <UtensilsCrossed className="w-6 h-6 text-rose-500" />,
  Droplets: <Droplets className="w-6 h-6 text-blue-500" />,
  Wrench: <Wrench className="w-6 h-6 text-emerald-500" />,
  Tv: <Tv className="w-6 h-6 text-teal-500" />
};

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeCoupons, setActiveCoupons] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [featuredServices, setFeaturedServices] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, srvRes, cpnRes] = await Promise.all([
          ApiClient.request('/services/categories'),
          ApiClient.request('/services'),
          ApiClient.request('/coupons')
        ]);

        if (catRes.success) setCategories(catRes.data || []);
        if (srvRes.success) setFeaturedServices(srvRes.data || []);
        if (cpnRes.success) setActiveCoupons(cpnRes.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleCategoryClick = (slug: string) => {
    setSelectedCategory(slug);
  };

  const filteredServices = featuredServices.filter((s) => {
    const matchesCategory =
      selectedCategory === 'ALL' || s.category?.slug === selectedCategory;
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category?.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen pb-24 bg-slate-50 text-gray-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8">
        {/* Responsive Hero Banner */}
        <section className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="inline-flex items-center space-x-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/30">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>India's Most Trusted Home Services Network</span>
            </span>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Hi {user ? user.name.split(' ')[0] : 'there'} 👋 <br />
              What home service do you need today?
            </h1>

            <p className="text-indigo-100 text-xs sm:text-sm max-w-xl leading-relaxed">
              Book certified Electricians, AC Technicians, Deep Cleaners, Plumbers and Maintenance experts in 60 seconds with live GPS tracking.
            </p>

            {/* Quick Search inside hero on desktop */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2 max-w-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search AC installation, house cleaning, wiring..."
                  className="w-full pl-10 pr-4 py-3 bg-white text-gray-900 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-md placeholder:text-gray-400"
                />
              </div>

              {activeCoupons.length > 0 ? (
                <div className="flex items-center bg-white/20 backdrop-blur-md rounded-2xl px-4 py-3 text-xs font-bold text-yellow-300 border border-white/30 whitespace-nowrap">
                  <Tag className="w-4 h-4 mr-2 text-yellow-300 flex-shrink-0" />
                  <span>Code: <strong>{activeCoupons[0].code}</strong> ({activeCoupons[0].discountPercentage}% OFF)</span>
                </div>
              ) : (
                <div className="flex items-center bg-white/20 backdrop-blur-md rounded-2xl px-4 py-3 text-xs font-bold text-yellow-300 border border-white/30 whitespace-nowrap">
                  <Tag className="w-4 h-4 mr-2 text-yellow-300 flex-shrink-0" />
                  <span>100% Verified Experts</span>
                </div>
              )}
            </div>
          </div>

          <div className="hidden lg:block absolute right-8 bottom-0 opacity-15 transform translate-x-4 translate-y-4">
            <Wrench className="w-64 h-64 text-white" />
          </div>
        </section>

        {/* Available Promo Coupons Showcase */}
        <CouponShowcase />

        {/* Service Categories Grid */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-gray-900">Service Categories</h2>
              <p className="text-xs text-gray-500">Pick a category to filter services instantly</p>
            </div>

            <button
              onClick={() => navigate('/services')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
            >
              <span>View All ({categories.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Responsive Category Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-3 sm:gap-4">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.slug;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(isSelected ? 'ALL' : cat.slug)}
                  className={`flex flex-col items-center p-3.5 sm:p-4 rounded-3xl border transition-all text-center group cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/30 scale-105'
                      : 'bg-white text-gray-800 border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-200'
                  }`}
                >
                  <div
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mb-2 transition-colors ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-50 group-hover:bg-indigo-50 text-indigo-600'
                    }`}
                  >
                    {iconMap[cat.icon] || <Wrench className="w-6 h-6" />}
                  </div>
                  <span
                    className={`text-[11px] sm:text-xs font-bold line-clamp-2 leading-tight ${
                      isSelected ? 'text-white' : 'text-gray-800'
                    }`}
                  >
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Popular / Filtered Services Responsive Grid */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-gray-900">
                {selectedCategory === 'ALL' ? 'Recommended Services' : `${categories.find((c) => c.slug === selectedCategory)?.name || 'Filtered'} Services`}
              </h2>
              <p className="text-xs text-gray-500">Tap on any service card below to view details and select a slot</p>
            </div>

            {selectedCategory !== 'ALL' && (
              <button
                onClick={() => setSelectedCategory('ALL')}
                className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-xl hover:bg-indigo-100"
              >
                Clear Filter
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="py-16 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 space-y-2">
              <p className="text-sm font-bold text-gray-700">No services match your current selection.</p>
              <button
                onClick={() => {
                  setSelectedCategory('ALL');
                  setSearchQuery('');
                }}
                className="text-xs font-bold text-indigo-600 hover:underline"
              >
                View all services
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  onClick={() => navigate(`/service/${service.id}`)}
                  className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center text-indigo-600 transition-colors">
                        {iconMap[service.icon] || <Wrench className="w-6 h-6" />}
                      </div>
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {service.category?.name}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-gray-900 group-hover:text-indigo-600 transition-colors">
                        {service.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                        {service.description}
                      </p>
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-gray-500 pt-2 border-t border-gray-100">
                      <span className="flex items-center text-amber-500 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 mr-1" />
                        4.9
                      </span>
                      <span>•</span>
                      <span className="flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1 text-gray-400" />
                        {service.durationMinutes} mins
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 mt-2 border-t border-gray-100">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-semibold block">Starts at</span>
                      <span className="text-lg font-black text-gray-900">₹{service.basePrice}</span>
                    </div>

                    <button className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-600/20 flex items-center space-x-1 transition-transform group-hover:scale-105 cursor-pointer">
                      <span>Book Service</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* NearWork Guarantee Banner */}
        <section className="bg-emerald-50 border border-emerald-200/80 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-600/20">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-base text-emerald-950">100% NearWork Trust & Quality Guarantee</h3>
              <p className="text-xs text-emerald-800 mt-0.5 max-w-xl">
                Background-verified professionals, transparent pricing with no hidden fees, and hassle-free re-service or refunds if not satisfied.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/services')}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-md whitespace-nowrap transition-transform active:scale-95 cursor-pointer"
          >
            Explore All Services
          </button>
        </section>
      </main>

      <AddressModal isOpen={showAddressModal} onClose={() => setShowAddressModal(false)} />
      <BottomNav />
    </div>
  );
};
