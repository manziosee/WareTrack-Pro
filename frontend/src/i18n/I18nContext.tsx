import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { DICTIONARIES, type Language } from './translations';

interface I18nContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  /** Translate an English label; unknown labels are returned unchanged. */
  t: (text: string) => string;
}

const STORAGE_KEY = 'waretrack-language';
const I18nContext = createContext<I18nContextType | undefined>(undefined);

function readLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'rw' || stored === 'fr') return stored;
  } catch {
    // Fall back to English if storage is unavailable
  }
  return 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The choice still applies for this session
    }
  };

  const t = useCallback((text: string) => DICTIONARIES[language][text] ?? text, [language]);

  return <I18nContext.Provider value={{ language, setLanguage, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}
