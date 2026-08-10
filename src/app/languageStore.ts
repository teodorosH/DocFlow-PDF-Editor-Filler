import { useEffect, useState } from 'react';

export type AppLanguage = 'he' | 'en' | 'ar' | 'am';

const STORAGE_KEY = 'docflow_language';
const listeners = new Set<(language: AppLanguage) => void>();

const isValidLanguage = (value: any): value is AppLanguage =>
  value === 'he' || value === 'en' || value === 'ar' || value === 'am';

const getInitialLanguage = (): AppLanguage => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isValidLanguage(stored)) return stored;
    }
  } catch {}
  return 'he';
};

let currentLanguage: AppLanguage = getInitialLanguage();

export function getAppLanguage(): AppLanguage {
  return currentLanguage;
}

export function setAppLanguage(language: AppLanguage) {
  if (!isValidLanguage(language)) return;
  currentLanguage = language;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, language);
    }
  } catch {}
  listeners.forEach((listener) => listener(language));
}

export function subscribeToAppLanguage(listener: (language: AppLanguage) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppLanguage() {
  const [language, setLanguageState] = useState<AppLanguage>(currentLanguage);

  useEffect(() => {
    const unsubscribe = subscribeToAppLanguage(setLanguageState);
    return unsubscribe;
  }, []);

  const setLanguage = (next: AppLanguage) => {
    setAppLanguage(next);
  };

  return [language, setLanguage] as const;
}
