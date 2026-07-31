import { useI18nStore } from '../i18nStore';

export const useTranslation = () => {
  const { lang, dir, dictionary } = useI18nStore();

  const t = (key: string, replacements?: Record<string, string>): string => {
    let translation = dictionary[key] || key;

    if (replacements) {
      Object.keys(replacements).forEach(rKey => {
        translation = translation.replace(`{{${rKey}}}`, replacements[rKey]);
      });
    }

    return translation;
  };

  const formatDate = (date: string | Date): string => {
    const locale = lang === 'ar' ? 'ar-SA' : 'en-US';
    return new Date(date).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  return { t, lang, dir, formatDate };
};
