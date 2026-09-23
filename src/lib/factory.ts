import type { Lang } from '../types';

// ─────────────────────────────────────────────────────────────────────
// Fixed factory letterhead — hard-coded everywhere it must appear
// (dashboard, every bill, every export)
// ─────────────────────────────────────────────────────────────────────
export const FACTORY = {
  nameEn: 'NEW ALMAKKA FACTORY',
  nameUr: 'نیو المکہ فیکٹری',
  line1Ur: 'ماربل فیکٹری',
  line2Ur: 'ہمارے ہاں ہر قسم ماربل با رعایت دستیاب ہیں۔',
  addressUr: 'پتہ : باجوڑ روڈ نیو ٹاؤن پل گندھاب ضلع مہمند',
  addressEn: 'Address: Bajor Road, New Town Pul, Gandhab, District Mohmand',
  proprietorsUr: 'پروپرائیٹر: ضیاد خان اینڈ امتیاز خان',
  proprietorsEn: 'Proprietors: Ziyad Khan & Imtiaz Khan',
  phone1: '0346-9190217',
  phone1Ur: 'ضیاد خان : 0346-9190217',
  phone1En: 'Ziyad Khan : 0346-9190217',
  phone2: '0300-5849242',
  phone2Ur: 'امتیاز خان : 0300-5849242',
  phone2En: 'Imtiaz Khan : 0300-5849242'
} as const;

/** Letterhead as plain lines, used by Excel / CSV / Word / WhatsApp exports */
export function letterheadLines(lang: Lang): string[] {
  return lang === 'ur'
    ? [
        FACTORY.nameUr,
        `${FACTORY.line1Ur} — ${FACTORY.line2Ur}`,
        FACTORY.addressUr,
        FACTORY.proprietorsUr,
        `${FACTORY.phone1Ur} | ${FACTORY.phone2Ur}`
      ]
    : [
        FACTORY.nameEn,
        'MARBLE FACTORY — Every kind of marble available',
        FACTORY.addressEn,
        FACTORY.proprietorsEn,
        `${FACTORY.phone1En} | ${FACTORY.phone2En}`
      ];
}
