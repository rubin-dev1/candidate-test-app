'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { translations, type T } from '@/lib/translations';
import type { Locale } from '@/lib/types';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: T;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ru');

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof window !== 'undefined') {
      localStorage.setItem('locale', l);
    }
  }, []);

  // Restore locale from localStorage on first render
  React.useEffect(() => {
    const saved = localStorage.getItem('locale') as Locale | null;
    if (saved === 'ru' || saved === 'en') setLocaleState(saved);
  }, []);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t: translations[locale] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
}
