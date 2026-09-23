import en from './en.json';
import ur from './ur.json';
import { useAppStore } from '../store/useAppStore';
import type { Lang } from '../types';

const dicts: Record<Lang, Record<string, string>> = {
  en: en as Record<string, string>,
  ur: ur as Record<string, string>
};

/** Translate without a hook (for export helpers etc.) */
export function tr(lang: Lang, key: string, params?: Record<string, string | number>): string {
  let s = dicts[lang]?.[key] ?? dicts.en[key] ?? key;
  if (params) {
    for (const k of Object.keys(params)) {
      s = s.replaceAll(`{{${k}}}`, String(params[k]));
    }
  }
  return s;
}

/**
 * useLang — lightweight custom i18n hook.
 * Returns t(), current lang, direction, and a setter (persisted by zustand).
 */
export function useLang() {
  const lang = useAppStore((s) => s.lang);
  const setLang = useAppStore((s) => s.setLang);

  const t = (key: string, params?: Record<string, string | number>) => tr(lang, key, params);

  return {
    lang,
    setLang,
    t,
    isUr: lang === 'ur',
    dir: (lang === 'ur' ? 'rtl' : 'ltr') as 'rtl' | 'ltr'
  };
}
