import React, { createContext, useContext, useState } from 'react';

export type Language = 'he' | 'en' | 'ar' | 'am';

export const TAB_TRANSLATIONS = {
  en: { editor: 'PDF Editor', history: 'History', generate: 'Invoices & Receipts' },
  he: { editor: 'עורך PDF', history: 'היסטוריה', generate: 'קבלות וחשבוניות' },
  ar: { editor: 'محرر PDF', history: 'السجل', generate: 'الفواتير والإيصالات' },
  am: { editor: 'ፒዲኤፍ አዘጋጅ', history: 'ታሪክ', generate: 'ደረሰኞች' },
};

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>('en');

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);