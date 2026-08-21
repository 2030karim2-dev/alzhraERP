import { useI18nStore, dictionaries } from '../i18nStore';

export const useTranslation = () => {
  const { lang, dir, dictionary } = useI18nStore();

  const t = (key: string, replacements?: Record<string, string>): string => {
    // Missing key fallback chain: current language → Arabic → raw key.
    let translation = dictionary[key];
    if (!translation && dictionaries.ar[key]) {
      translation = dictionaries.ar[key];
    }
    if (!translation) translation = key;

    if (replacements) {
      Object.keys(replacements).forEach(rKey => {
        translation = translation.replace(`{{${rKey}}}`, replacements[rKey]);
      });
    }

    return translation;
  };

  const formatDate = (date: string | Date): string => {
    // `-u-nu-latn` يضمن أرقاماً إنجليزية حتى مع التوطين العربي (أسماء شهور عربية + أرقام إنجليزية)
    const locale = lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US';
    return new Date(date).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  return { t, lang, dir, formatDate };
};
