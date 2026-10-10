import type { Language } from '@krishi/shared';
import { useTranslation } from 'react-i18next';
import { currentLanguage, isLanguage } from './index';

type LocalizableField = 'name' | 'title' | 'description';

/**
 * Picks the language-specific variant of a master-data field:
 * `nameBn` / `nameHi` / `name`, `titleBn` / `titleHi` / `title`, and so on.
 * Falls back to the base (English) field when the translation is empty.
 */
export function localized(item: object | null | undefined, field: LocalizableField, lang: Language): string {
  if (!item) return '';
  const record = item as Record<string, unknown>;
  const suffix = lang === 'bn' ? 'Bn' : lang === 'hi' ? 'Hi' : '';
  const value = suffix ? record[`${field}${suffix}`] : undefined;
  if (typeof value === 'string' && value.trim()) return value;
  const base = record[field];
  return typeof base === 'string' ? base : '';
}

/** Current UI language plus a bound `localized` helper. */
export function useLanguage() {
  const { i18n } = useTranslation();
  const lang: Language = isLanguage(i18n.language) ? i18n.language : currentLanguage();
  return {
    lang,
    loc: (item: object | null | undefined, field: LocalizableField = 'name') => localized(item, field, lang),
  };
}
