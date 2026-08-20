import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'hi';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, defaultText?: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Nav & Header
    'nav.home': 'Home',
    'nav.bookings': 'Bookings',
    'nav.services': 'Services',
    'nav.profile': 'Profile',
    'nav.login': 'Login / Register',
    'nav.logout': 'Sign Out',
    'nav.language': 'Language',

    // Home Page
    'home.hero_title': 'Reliable Home Services at Your Doorstep',
    'home.hero_subtitle': 'Verified electricians, cleaners, plumbers & AC technicians in your neighborhood.',
    'home.search_placeholder': 'Search for Electrician, AC Repair, Cleaning...',
    'home.categories_title': 'Explore Service Categories',
    'home.popular_services': 'Most Booked Services',
    'home.book_now': 'Book Now',
    'home.guarantee_title': 'NearWork Safety & Quality Promise',
    'home.guarantee_desc': '100% verified background-checked professionals with transparent upfront pricing.',

    // Service Detail & Booking
    'service.included': "What's Included in This Service",
    'service.schedule_title': 'Schedule Service Appointment',
    'service.select_date': 'Select Date',
    'service.select_slot': 'Select Time Slot',
    'service.instructions': 'Special Instructions (Optional)',
    'service.proceed_to_book': 'Proceed to Book',
    'service.total_estimated': 'Total Estimated',

    // Checkout
    'checkout.summary': 'Service Appointment Summary',
    'checkout.location': 'Service Location Address',
    'checkout.change_address': 'Change Address',
    'checkout.payment_mode': 'Select Payment Mode',
    'checkout.cash': 'Pay After Service (Cash / UPI)',
    'checkout.cash_desc': 'Pay directly to technician after service completion',
    'checkout.online': 'Pay Online (Razorpay)',
    'checkout.online_desc': 'UPI, Cards & NetBanking with instant confirmation',
    'checkout.coupon_title': 'Apply Coupon Code',
    'checkout.apply': 'Apply',
    'checkout.total_payable': 'Total Payable',
    'checkout.book_cash_btn': 'Book with Cash',
    'checkout.pay_online_btn': 'Pay Online via Razorpay',
    'checkout.processing': 'Booking Service & Dispatching Partner...',

    // Live Tracking
    'tracking.title': 'Live Service Execution & Tracking',
    'tracking.otp_label': 'Your 4-Digit Security PIN',
    'tracking.otp_instruction': 'Share this PIN with technician ONLY upon doorstep arrival to start work',
    'tracking.status_assigned': 'Technician Assigned',
    'tracking.status_enroute': 'Technician On The Way',
    'tracking.status_arrived': 'Technician At Doorstep',
    'tracking.status_started': 'Service in Progress',
    'tracking.status_completed': 'Service Completed',
    'tracking.chat_btn': 'Chat with Partner',
    'tracking.call_btn': 'Call Partner',
    'tracking.cancel_booking': 'Cancel Booking',

    // Bookings List
    'bookings.title': 'My Service Bookings',
    'bookings.no_bookings': 'No bookings found yet',
    'bookings.track_btn': 'Track Live Status',
    'bookings.cancel_btn': 'Cancel',

    // Categories
    'cat.electrician': 'Electrician',
    'cat.cleaning': 'House Cleaning',
    'cat.plumbing': 'Plumbing',
    'cat.ac': 'AC Service & Repair',
    'cat.appliance': 'Appliance Repair',
    'cat.tank': 'Water Tank Cleaning'
  },
  hi: {
    // Nav & Header
    'nav.home': 'होम',
    'nav.bookings': 'मेरी बुकिंग्स',
    'nav.services': 'सेवाएं',
    'nav.profile': 'प्रोफाइल',
    'nav.login': 'लॉगिन / रजिस्टर',
    'nav.logout': 'लॉगआउट',
    'nav.language': 'भाषा बदलें',

    // Home Page
    'home.hero_title': 'विश्वसनीय घरेलू सेवाएं, आपके द्वार पर',
    'home.hero_subtitle': 'सत्यापित इलेक्ट्रीशियन, सफाई कर्मी, प्लंबर और एसी तकनीशियन तुरंत उपलब्ध।',
    'home.search_placeholder': 'इलेक्ट्रीशियन, एसी रिपेयर, सफाई खोजें...',
    'home.categories_title': 'सेवा श्रेणियां देखें',
    'home.popular_services': 'सर्वाधिक बुक की जाने वाली सेवाएं',
    'home.book_now': 'अभी बुक करें',
    'home.guarantee_title': 'नियरवर्क सुरक्षा और गुणवत्ता का वादा',
    'home.guarantee_desc': '100% सत्यापित प्रोफेशनल्स और पारदर्शी मूल्य निर्धारण।',

    // Service Detail & Booking
    'service.included': 'इस सेवा में क्या शामिल है',
    'service.schedule_title': 'सेवा का समय निर्धारित करें',
    'service.select_date': 'तारीख चुनें',
    'service.select_slot': 'समय स्लॉट चुनें',
    'service.instructions': 'विशेष निर्देश (वैकल्पिक)',
    'service.proceed_to_book': 'आगे बढ़ें और बुक करें',
    'service.total_estimated': 'अनुमानित कुल राशि',

    // Checkout
    'checkout.summary': 'सेवा अपॉइंटमेंट विवरण',
    'checkout.location': 'सेवा का पता',
    'checkout.change_address': 'पता बदलें',
    'checkout.payment_mode': 'भुगतान का तरीका चुनें',
    'checkout.cash': 'काम के बाद भुगतान (कैश / यूपीआई)',
    'checkout.cash_desc': 'सेवा पूरी होने के बाद ही सीधे तकनीशियन को भुगतान करें',
    'checkout.online': 'ऑनलाइन भुगतान (रेज़रपे)',
    'checkout.online_desc': 'यूपीआई (Google Pay, PhonePe), कार्ड और नेटबैंकिंग',
    'checkout.coupon_title': 'कूपन कोड लगाएं',
    'checkout.apply': 'लागू करें',
    'checkout.total_payable': 'कुल देय राशि',
    'checkout.book_cash_btn': 'कैश ऑन डिलीवरी पर बुक करें',
    'checkout.pay_online_btn': 'रेज़रपे से ऑनलाइन भुगतान करें',
    'checkout.processing': 'सेवा बुक हो रही है...',

    // Live Tracking
    'tracking.title': 'लाइव सेवा स्थिति एवं ट्रैकिंग',
    'tracking.otp_label': 'आपका 4-अंकीय सुरक्षा पिन (OTP)',
    'tracking.otp_instruction': 'काम शुरू कराने के लिए तकनीशियन के घर आने पर ही यह पिन साझा करें',
    'tracking.status_assigned': 'तकनीशियन नियुक्त हो गया है',
    'tracking.status_enroute': 'तकनीशियन रास्ते में है',
    'tracking.status_arrived': 'तकनीशियन दरवाजे पर पहुंच गया है',
    'tracking.status_started': 'काम शुरू हो चुका है',
    'tracking.status_completed': 'काम सफलतापूर्वक पूरा हुआ',
    'tracking.chat_btn': 'पार्टनर से चैट करें',
    'tracking.call_btn': 'पार्टनर को कॉल करें',
    'tracking.cancel_booking': 'बुकिंग रद्द करें',

    // Bookings List
    'bookings.title': 'मेरी सभी बुकिंग्स',
    'bookings.no_bookings': 'अभी तक कोई बुकिंग नहीं मिली',
    'bookings.track_btn': 'लाइव स्थिति देखें',
    'bookings.cancel_btn': 'रद्द करें',

    // Categories
    'cat.electrician': 'इलेक्ट्रीशियन',
    'cat.cleaning': 'घर की सफाई',
    'cat.plumbing': 'प्लंबिंग',
    'cat.ac': 'एसी सर्विस एवं रिपेयर',
    'cat.appliance': 'उपकरण मरम्मत',
    'cat.tank': 'पानी की टंकी सफाई'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('nearwork_lang') as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('nearwork_lang', lang);
  };

  const t = (key: string, defaultText?: string): string => {
    return translations[language]?.[key] || defaultText || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
