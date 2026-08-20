import React from 'react';
import { Globe } from 'lucide-react';
import { useWorkerLanguage } from '../context/LanguageContext';

export const WorkerLanguageToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { language, setLanguage } = useWorkerLanguage();

  return (
    <div
      className={`inline-flex items-center p-1 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-bold ${className}`}
    >
      <Globe className="w-3.5 h-3.5 mx-1 text-slate-400 flex-shrink-0" />
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-2.5 py-1 rounded-xl transition-all ${
          language === 'en'
            ? 'bg-emerald-600 text-white shadow-sm font-extrabold'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage('hi')}
        className={`px-2.5 py-1 rounded-xl transition-all ${
          language === 'hi'
            ? 'bg-emerald-600 text-white shadow-sm font-extrabold'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        हिन्दी
      </button>
    </div>
  );
};
