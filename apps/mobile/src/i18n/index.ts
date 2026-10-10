import { LANGUAGES, type Language } from '@krishi/shared';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import bn from './locales/bn.json';
import en from './locales/en.json';
import hi from './locales/hi.json';

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

/** Device language if it is one we support, otherwise Bengali. */
export function detectDeviceLanguage(): Language {
  try {
    for (const locale of Localization.getLocales()) {
      if (isLanguage(locale.languageCode)) return locale.languageCode;
    }
  } catch {
    // ignore
  }
  return 'bn';
}

export const LANGUAGE_NATIVE_NAMES: Record<Language, string> = {
  bn: 'বাংলা',
  hi: 'हिन्दी',
  en: 'English',
};

/** Shown on the language picker in display order: Bengali first for West Bengal. */
export const LANGUAGE_ORDER: Language[] = ['bn', 'hi', 'en'];

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    bn: { translation: bn },
  },
  lng: detectDeviceLanguage(),
  fallbackLng: 'en',
  supportedLngs: [...LANGUAGES],
  interpolation: { escapeValue: false },
  returnNull: false,
  react: { useSuspense: false },
});

export function currentLanguage(): Language {
  return isLanguage(i18n.language) ? i18n.language : 'bn';
}

export default i18n;
