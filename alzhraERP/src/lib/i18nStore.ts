// ============================================
// Internationalization Store
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Import translations from JSON files
import ar from './locales/ar.json';
import en from './locales/en.json';

type Lang = 'en' | 'ar';

interface I18nState {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  dictionary: Record<string, string>;
  setLang: (lang: Lang) => void;
  initializeLang: () => void;
}

// Dictionary mapping
const dictionaries: Record<Lang, Record<string, string>> = {
  ar,
  en
};

export const useI18nStore = create<I18nState>()(
  persist(
    (set, get) => ({
      lang: 'ar',
      dir: 'rtl',
      dictionary: dictionaries.ar,

      setLang: (lang: Lang) => {
        set({
          lang,
          dir: lang === 'ar' ? 'rtl' : 'ltr',
          dictionary: dictionaries[lang]
        });

        // Update document direction
        if (typeof document !== 'undefined') {
          document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
          document.documentElement.lang = lang;
        }
      },

      initializeLang: () => {
        const { lang } = get();
        set({
          dictionary: dictionaries[lang],
          dir: lang === 'ar' ? 'rtl' : 'ltr'
        });

        // Update document direction
        if (typeof document !== 'undefined') {
          document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
          document.documentElement.lang = lang;
        }
      }
    }),
    {
      name: 'alzhra-i18n',
      partialize: (state) => ({
        lang: state.lang
      })
    }
  )
);

// Export dictionaries for direct access if needed
export { dictionaries };

// Export types
export type { Lang, I18nState };
