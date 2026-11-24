import React from 'react';
import { useI18n } from '../i18n/I18nContext.js';
import { Globe } from 'lucide-react';

export const LanguageToggle: React.FC = () => {
  const { lang, toggleLang } = useI18n();

  return (
    <button
      type="button"
      onClick={toggleLang}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border border-white/20 bg-white/10 hover:bg-white/20 text-white transition cursor-pointer select-none"
      title={lang === 'en' ? 'Chuyển sang Tiếng Việt' : 'Switch to English'}
      aria-label={lang === 'en' ? 'Chuyển sang Tiếng Việt' : 'Switch to English'}
    >
      <Globe size={14} className="opacity-80" />
      <span className="uppercase font-mono">{lang === 'en' ? 'EN' : 'VI'}</span>
    </button>
  );
};
