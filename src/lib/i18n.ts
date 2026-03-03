export type Language = 'en' | 'tn';

const translations: Record<string, Record<Language, string>> = {
  // General
  'app.name': { en: 'ChekaMeds', tn: 'ChekaMeds' },
  'app.tagline': { en: 'Powered by IBLIM ENTERPRISE', tn: 'E Tsamaiswa ke IBLIM ENTERPRISE' },
  'app.greeting': { en: 'Welcome back', tn: 'O amogelesega gape' },

  // Navigation
  'nav.dashboard': { en: 'Dashboard', tn: 'Setlhogo' },
  'nav.map': { en: 'Map View', tn: 'Mmapa' },
  'nav.inventory': { en: 'My Inventory', tn: 'Ditlhare Tsa Me' },
  'nav.analytics': { en: 'Analytics', tn: 'Dipalopalo' },
  'nav.whatsapp': { en: 'WhatsApp Bot', tn: 'WhatsApp Bot' },
  'nav.prescriptions': { en: 'Prescriptions', tn: 'Ditaelo tsa Kalafi' },
  'nav.forecasting': { en: 'Forecasting', tn: 'Diponelopele' },
  'nav.qr_codes': { en: 'QR Codes', tn: 'QR Codes' },
  'nav.settings': { en: 'Settings', tn: 'Ditlhophiso' },
  'nav.sign_out': { en: 'Sign out', tn: 'Tswa' },

  // Stats
  'stats.clinics_monitored': { en: 'Clinics Monitored', tn: 'Dikliniiki Tse di Tlhatlhobiwang' },
  'stats.critical_shortages': { en: 'Critical Shortages', tn: 'Tlhaelo e Kgolo' },
  'stats.meds_tracked': { en: 'Meds Tracked', tn: 'Ditlhare Tse di Latedisiwang' },
  'stats.running_low': { en: 'Running Low', tn: 'Di a Fela' },

  // Dashboard
  'dashboard.title': { en: 'National Medicine Stock Dashboard', tn: 'Setlhogo sa Ditlhare sa Bosetšhaba' },
  'dashboard.subtitle': { en: 'Real-time shelf-level visibility across Gaborone District health facilities.', tn: 'Pono ya ditlhare ka nako ya sebele mo dikliniking tsa Gaborone.' },

  // Login
  'login.staff_portal': { en: 'Staff portal', tn: 'Kgoro ya badiri' },
  'login.register': { en: 'Register facility', tn: 'Kwadisa setsidifatsi' },
  'login.sign_in': { en: 'Sign in to dashboard', tn: 'Tsena mo setlhogong' },
  'login.create_account': { en: 'Create clinic account', tn: 'Bula akhaonto ya kliniiki' },

  // Features
  'feature.sms_ussd': { en: 'SMS/USSD Access', tn: 'Phitlhelelo ka SMS/USSD' },
  'feature.sms_ussd_desc': { en: 'Dial *123# from any phone to check medicine availability. No smartphone or WhatsApp needed.', tn: 'Letsa *123# go supa ditlhare. Ga o tlhoke mogala wa botlhale.' },
  'feature.prescription': { en: 'Prescription Matching', tn: 'Go Bapisa Ditaelo' },
  'feature.prescription_desc': { en: 'Text your full prescription list and find the nearest clinic with ALL your medicines in stock.', tn: 'Romela lenaane la ditlhare tsa gago mme o bone kliniiki e e gaufi e e nang le tsotlhe.' },
  'feature.forecasting': { en: 'Stock Forecasting', tn: 'Diponelopele tsa Setoko' },
  'feature.forecasting_desc': { en: 'AI predicts when clinics will run out of medicines and auto-alerts suppliers before shortages hit.', tn: 'AI e bolela gore ditlhare di tla fela leng mme e itsise batlamedi.' },
  'feature.dhis2': { en: 'DHIS2 Integration', tn: 'Tirisano le DHIS2' },
  'feature.dhis2_desc': { en: 'Connect to Botswana\'s national health information system for automated facility registration and reporting.', tn: 'Golagana le tsamaiso ya bosetšhaba ya tshedimosetso ya boitekanelo.' },
  'feature.qr': { en: 'QR Verification', tn: 'Netefatso ya QR' },
  'feature.qr_desc': { en: 'Scan QR codes on medicine packages to verify authenticity and fight counterfeit drugs.', tn: 'Skena di-QR code go netefatsa ditlhare le go lwantsha ditlhare tsa maitiso.' },
};

let currentLanguage: Language = 'en';

export const setLanguage = (lang: Language) => {
  currentLanguage = lang;
};

export const getLanguage = (): Language => currentLanguage;

export const t = (key: string): string => {
  return translations[key]?.[currentLanguage] || translations[key]?.en || key;
};

export const useLanguage = () => {
  return { language: currentLanguage, setLanguage, t };
};
