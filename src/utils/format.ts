import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import type { Lang } from '../types';

dayjs.extend(isoWeek);

// Urdu digits → Latin digits (numbers ALWAYS show as 1234 style in this app)
const URDU_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function toLatinDigits(s: string): string {
  return s.replace(/[۰-۹٠-٩]/g, (d) => {
    const u = URDU_DIGITS.indexOf(d);
    if (u >= 0) return String(u);
    return String(ARABIC_DIGITS.indexOf(d));
  });
}

/** Safe number from anything (null-safe, tolerates Urdu digits & commas) */
export function num(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = parseFloat(toLatinDigits(String(v ?? '')).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

/** 1234567 → "1,234,567" — Latin digits with thousand separators, max 2 decimals */
export function fmtNum(v: unknown): string {
  const n = num(v);
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);
}

/** Rs. 12,500 (English) / 12,500 روپے (Urdu) */
export function fmtMoney(v: unknown, lang: Lang): string {
  return lang === 'ur' ? `${fmtNum(v)} روپے` : `Rs. ${fmtNum(v)}`;
}

export const todayStr = (): string => dayjs().format('YYYY-MM-DD');

/** Dates always render with Latin digits in both languages */
export function fmtDate(v: string | null | undefined): string {
  if (!v) return '-';
  const d = dayjs(v);
  return d.isValid() ? d.format('DD-MM-YYYY') : '-';
}

export function fmtMonthYear(v: string | number | Date): string {
  return dayjs(v).format('YYYY-MM');
}

const UR_MONTHS = ['جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون', 'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر'];
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function monthLabel(monthIndex0: number, lang: Lang): string {
  return lang === 'ur' ? UR_MONTHS[monthIndex0] ?? '' : EN_MONTHS[monthIndex0] ?? '';
}

const UR_DAYS = ['اتوار', 'پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ'];
const EN_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function dayLabel(dayIndex0: number, lang: Lang): string {
  return lang === 'ur' ? UR_DAYS[dayIndex0] ?? '' : EN_DAYS[dayIndex0] ?? '';
}

export { dayjs };
