import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Star,
  Clock,
  Wrench,
  Zap,
  Wind,
  Disc,
  Sparkles,
  UtensilsCrossed,
  Droplets,
  Tv,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { ApiClient } from '../services/api';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';

const iconMap: Record<string, React.ReactNode> = {
  Zap: <Zap className="w-5 h-5 text-amber-500" />,
  Wind: <Wind className="w-5 h-5 text-sky-500" />,
  Disc: <Disc className="w-5 h-5 text-indigo-500" />,
  Sparkles: <Sparkles className="w-5 h-5 text-purple-500" />,
  UtensilsCrossed: <UtensilsCrossed className="w-5 h-5 text-rose-500" />,
  Droplets: <Droplets className="w-5 h-5 text-blue-500" />,
  Wrench: <Wrench className="w-5 h-5 text-emerald-500" />,
  Tv: <Tv className="w-5 h-5 text-teal-500" />
};

export const ServicesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'ALL';

  const [categories, setCategories] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, srvRes] = await Promise.all([
          ApiClient.request('/services/categories'),
          ApiClient.request('/services')
        ]);
        if (catRes.success) setCategories(catRes.data || []);
        if (srvRes.success) setServices(srvRes.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) setActiveCategory(cat);
  }, [searchParams]);

  const handleSelectCategory = (slug: string) => {
    setActiveCategory(slug);
    if (slug === 'ALL') {
      setSearchParams({});
    } else {
      setSearchParams({ category: slug });
    }
  };

  const filteredServices = services.filter((s) => {
    const matchesCategory =
      activeCategory === 'ALL' || s.category?.slug === activeCategory;
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category?.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen pb-24 bg-slate-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Page Title & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Explore Home Services</h1>
            <p className="text-xs text-gray-500 mt-1">
              Select verified experts for electrical, cleaning, plumbing, AC & appliance repair
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by service or keyword..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
          </div>
        </div>

        {/* Category Horizontal Filter Pills */}
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => handleSelectCategory('ALL')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
              activeCategory === 'ALL'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-indigo-300'
            }`}
          >
            All Services ({services.length})
          </button>

          {categories.map((c) => {
            const isSelected = activeCategory === c.slug;
            return (
              <button
                key={c.id}
                onClick={() => handleSelectCategory(c.slug)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-2 flex-shrink-0 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-indigo-300'
                }`}
              >
                <span>{c.name}</span>
              </button>
            );
          })}
        </div>

        {/* Services Responsive Grid */}
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 space-y-3">
            <Wrench className="w-12 h-12 text-gray-300 mx-auto" />
            <h3 className="font-bold text-base text-gray-800">No Services Found</h3>
            <p className="text-xs text-gray-500">
              Try adjusting your search query or selecting another category.
            </p>
            <button
              onClick={() => {
                setActiveCategory('ALL');
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-indigo-50 text-indigo-600 font-bold text-xs rounded-xl"
            >
              Reset Filters
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

                  <button className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-600/20 flex items-center space-x-1 transition-transform group-hover:scale-105">
                    <span>Book Now</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};
