import React, { createContext, useContext, useState } from 'react';

export type Language = 'en' | 'hi';

interface WorkerLanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, defaultText?: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Header & Status
    'worker.nav_title': 'NearWork Partner Cockpit',
    'worker.status_online': 'ONLINE',
    'worker.status_offline': 'OFFLINE',
    'worker.status_onjob': 'ON ACTIVE JOB',
    'worker.toggle_online_hint': 'Toggle status to receive real-time customer job dispatches',
    'worker.earnings_menu': 'Earnings & Payouts',
    'worker.dashboard_menu': 'Partner Dashboard',
    'worker.logout': 'Sign Out',

    // Dashboard KPI Cards
    'worker.today_earnings': "TODAY'S EARNINGS",
    'worker.earnings_subtitle': 'Withdrawable instantly to bank',
    'worker.completed_jobs': 'COMPLETED SERVICES',
    'worker.jobs_subtitle': 'Total jobs completed on NearWork',
    'worker.rating': 'CUSTOMER RATING',
    'worker.rating_subtitle': '5-star performance rating',

    // Incoming Job Alert
    'worker.dispatch_title': '⚡ Incoming Service Dispatch!',
    'worker.net_payout': 'Your Net Payout',
    'worker.customer': 'Customer',
    'worker.schedule': 'Schedule',
    'worker.accept_btn': 'Accept Job & Start',
    'worker.decline_btn': 'Decline',

    // Active Service Card
    'worker.active_job_title': 'Active Service Job',
    'worker.no_active_job': 'No Active Job Right Now',
    'worker.open_cockpit_btn': 'Open Job Execution Panel',
    'worker.recent_history': 'Recent Service History',
    'worker.no_history': 'No completed jobs yet',

    // Execution Stages
    'exec.stage_enroute_title': 'Start Travel to Customer Address',
    'exec.stage_enroute_btn': "I'm On The Way (Start Travel)",
    'exec.stage_arrived_title': 'Verify Arrival at Customer Location',
    'exec.stage_arrived_btn': "I've Arrived at Customer Location",
    'exec.stage_otp_title': 'Verify Customer 4-Digit Security PIN',
    'exec.stage_otp_placeholder': 'Enter 4-digit PIN given by customer',
    'exec.stage_otp_btn': 'Verify PIN & Start Service',
    'exec.stage_complete_title': 'Complete Job & Request Payment',
    'exec.stage_complete_btn': 'Complete Service & Collect Payment',
    'exec.extra_charge_btn': 'Add Extra Work Charge',
    'exec.chat_with_customer': 'Chat with Customer',
    'exec.call_customer': 'Call Customer'
  },
  hi: {
    // Header & Status
    'worker.nav_title': 'नियरवर्क पार्टनर कॉकपिट',
    'worker.status_online': 'ऑनलाइन (उपलब्ध)',
    'worker.status_offline': 'ऑफलाइन',
    'worker.status_onjob': 'कार्य प्रगति पर है',
    'worker.toggle_online_hint': 'ग्राहकों से नए कार्य पाने के लिए ऑनलाइन बटन चालू रखें',
    'worker.earnings_menu': 'कमाई और बैंक निकासी',
    'worker.dashboard_menu': 'पार्टनर डैशबोर्ड',
    'worker.logout': 'लॉगआउट',

    // Dashboard KPI Cards
    'worker.today_earnings': 'आज की कमाई',
    'worker.earnings_subtitle': 'तुरंत बैंक खाते में निकासी योग्य',
    'worker.completed_jobs': 'पूर्ण किए गए कार्य',
    'worker.jobs_subtitle': 'नियरवर्क पर कुल सफल सेवाएं',
    'worker.rating': 'ग्राहक रेटिंग',
    'worker.rating_subtitle': '5-स्टार गुणवत्ता रेटिंग',

    // Incoming Job Alert
    'worker.dispatch_title': '⚡ नया सेवा कार्य प्राप्त हुआ!',
    'worker.net_payout': 'आपकी शुद्ध कमाई',
    'worker.customer': 'ग्राहक',
    'worker.schedule': 'समय',
    'worker.accept_btn': 'कार्य स्वीकार करें',
    'worker.decline_btn': 'अस्वीकार करें',

    // Active Service Card
    'worker.active_job_title': 'चल रहा वर्तमान कार्य',
    'worker.no_active_job': 'फिलहाल कोई सक्रिय कार्य नहीं है',
    'worker.open_cockpit_btn': 'कार्य निष्पादन पैनल खोलें',
    'worker.recent_history': 'हालिया कार्य इतिहास',
    'worker.no_history': 'अभी तक कोई पूर्ण कार्य नहीं है',

    // Execution Stages
    'exec.stage_enroute_title': 'ग्राहक के पते की ओर प्रस्थान करें',
    'exec.stage_enroute_btn': 'मैं रास्ते में हूँ (सफर शुरू करें)',
    'exec.stage_arrived_title': 'ग्राहक के पते पर पहुंच सत्यापित करें',
    'exec.stage_arrived_btn': 'मैं ग्राहक के दरवाजे पर पहुंच गया हूँ',
    'exec.stage_otp_title': 'ग्राहक का 4-अंकीय सुरक्षा पिन दर्ज करें',
    'exec.stage_otp_placeholder': 'ग्राहक द्वारा बताया गया 4-अंकीय पिन लिखें',
    'exec.stage_otp_btn': 'पिन सत्यापित करें और काम शुरू करें',
    'exec.stage_complete_title': 'काम पूरा करें और भुगतान प्राप्त करें',
    'exec.stage_complete_btn': 'सेवा पूर्ण करें एवं राशि प्राप्त करें',
    'exec.extra_charge_btn': 'अतिरिक्त सामग्री शुल्क जोड़ें',
    'exec.chat_with_customer': 'ग्राहक से चैट करें',
    'exec.call_customer': 'ग्राहक को कॉल करें'
  }
};

const WorkerLanguageContext = createContext<WorkerLanguageContextType | undefined>(undefined);

export const WorkerLanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('nearwork_worker_lang') as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('nearwork_worker_lang', lang);
  };

  const t = (key: string, defaultText?: string): string => {
    return translations[language]?.[key] || defaultText || key;
  };

  return (
    <WorkerLanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </WorkerLanguageContext.Provider>
  );
};

export const useWorkerLanguage = () => {
  const context = useContext(WorkerLanguageContext);
  if (!context) {
    throw new Error('useWorkerLanguage must be used within WorkerLanguageProvider');
  }
  return context;
};
