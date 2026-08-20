import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const LanguageToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className={`inline-flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold ${className}`}
    >
      <Globe className="w-3.5 h-3.5 mx-1 text-slate-500 flex-shrink-0" />
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-2.5 py-1 rounded-xl transition-all ${
          language === 'en'
            ? 'bg-white text-indigo-600 shadow-sm font-extrabold'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        English
      </button>
      <button
        type="button"
        onClick={() => setLanguage('hi')}
        className={`px-2.5 py-1 rounded-xl transition-all ${
          language === 'hi'
            ? 'bg-indigo-600 text-white shadow-sm font-extrabold'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        हिन्दी
      </button>
    </div>
  );
};
