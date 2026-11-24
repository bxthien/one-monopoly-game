import React, { createContext, useContext, useEffect, useState } from 'react';
import { translations, type Language } from './translations.js';

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (keyPath: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('one_monopoly_lang');
    return saved === 'vi' ? 'vi' : 'en'; // English default!
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('one_monopoly_lang', newLang);
  };

  const toggleLang = () => {
    setLang(lang === 'en' ? 'vi' : 'en');
  };

  const t = (keyPath: string, params?: Record<string, string | number>): string => {
    const [scope, key] = keyPath.split('.');
    const dict = translations[lang] || translations.en;
    const scopeObj = (dict as any)?.[scope] || (translations.en as any)?.[scope];
    let val: string = scopeObj?.[key] ?? (translations.en as any)?.[scope]?.[key] ?? keyPath;

    if (params) {
      for (const [pKey, pVal] of Object.entries(params)) {
        val = val.replaceAll(`{{${pKey}}}`, String(pVal));
      }
    }
    return val;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
