// ─────────────────────────────────────────────────────────────────────
// Types + shared option lists (bilingual labels live with the data so
// dropdowns never depend on i18n keys being in sync)
// ─────────────────────────────────────────────────────────────────────
export type Lang = 'ur' | 'en';
export type RateMode = 'sqft' | 'qty';

export interface Option {
  value: string;
  ur: string;
  en: string;
}

export const CUSTOM_VALUE = '__custom__';

export function optLabel(
  list: Option[],
  value: string | null | undefined,
  lang: Lang,
  fallback = ''
): string {
  if (!value) return fallback;
  const found = list.find((o) => o.value === value);
  if (found) return lang === 'ur' ? found.ur : found.en;
  return fallback || value;
}

// ── Option lists (کھاتے کی عام اقسام) ──────────────────────────────
export const CUSTOMER_TYPES: Option[] = [
  { value: 'customer', ur: 'گاہک', en: 'Customer' },
  { value: 'supplier', ur: 'سپلائر', en: 'Supplier' },
  { value: 'both', ur: 'دونوں', en: 'Both' }
];

export const LEDGER_KINDS: Option[] = [
  { value: 'udhaar', ur: 'ادھار', en: 'Credit (Udhaar)' },
  { value: 'jama', ur: 'جمع', en: 'Received (Jama)' },
  { value: 'kharid', ur: 'خریداری', en: 'Purchase' },
  { value: 'farokht', ur: 'فروخت', en: 'Sale' },
  { value: 'payment', ur: 'ادائیگی (ادھار واپس)', en: 'Payment (Return)' }
];

export const LABOUR_CATEGORIES: Option[] = [
  { value: 'mistri', ur: 'مستری', en: 'Mistri (Mason)' },
  { value: 'helper', ur: 'ہیلپر', en: 'Helper' },
  { value: 'polish', ur: 'پالش', en: 'Polish' },
  { value: 'cutting', ur: 'کٹنگ', en: 'Cutting' },
  { value: 'loading', ur: 'لوڈنگ', en: 'Loading' },
  { value: 'other', ur: 'دیگر', en: 'Other' }
];

export const ATTENDANCE_STATUSES: Option[] = [
  { value: 'present', ur: 'حاضر', en: 'Present' },
  { value: 'absent', ur: 'غیر حاضر', en: 'Absent' },
  { value: 'half', ur: 'آدھا دن', en: 'Half Day' },
  { value: 'leave', ur: 'چھٹی', en: 'Leave' }
];

export const MACHINE_TYPES: Option[] = [
  { value: 'cutter', ur: 'کٹر', en: 'Cutter' },
  { value: 'polisher', ur: 'پالشر', en: 'Polisher' },
  { value: 'grinder', ur: 'گرائنڈر', en: 'Grinder' },
  { value: 'tractor', ur: 'ٹریکٹر', en: 'Tractor' },
  { value: 'other', ur: 'دیگر', en: 'Other' }
];

export const MACHINE_STATUS: Option[] = [
  { value: 'working', ur: 'چل رہی ہے', en: 'Working' },
  { value: 'repair', ur: 'مرمت میں', en: 'In Repair' },
  { value: 'idle', ur: 'بند', en: 'Idle' }
];

export const EXPENSE_CATEGORIES: Option[] = [
  { value: 'bijli', ur: 'بجلی', en: 'Electricity' },
  { value: 'diesel', ur: 'ڈیزل', en: 'Diesel' },
  { value: 'transport', ur: 'ٹرانسپورٹ', en: 'Transport' },
  { value: 'repair', ur: 'مرمت', en: 'Repair' },
  { value: 'khana', ur: 'کھانا', en: 'Food' },
  { value: 'other', ur: 'دیگر', en: 'Other' }
];

export const MARBLE_CUTS: Option[] = [
  { value: 'slab', ur: 'سلیب', en: 'Slab' },
  { value: 'tile', ur: 'ٹائل', en: 'Tile' },
  { value: 'patti', ur: 'پتی', en: 'Patti (Strip)' },
  { value: 'border', ur: 'بارڈر', en: 'Border' },
  { value: 'stair', ur: 'سیڑھی', en: 'Stair' },
  { value: 'chowkhat', ur: 'چوکھٹ', en: 'Door Frame' },
  { value: 'other', ur: 'دیگر', en: 'Other' }
];

export const PAYMENT_MODES: Option[] = [
  { value: 'cash', ur: 'نقد', en: 'Cash' },
  { value: 'bank', ur: 'بینک', en: 'Bank' },
  { value: 'other', ur: 'دیگر', en: 'Other' }
];

export const SIZE_UNITS: Option[] = [
  { value: 'inch', ur: 'انچ', en: 'Inch' },
  { value: 'feet', ur: 'فٹ', en: 'Feet' }
];

// ── Database row types ───────────────────────────────────────────────
export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address_note: string | null;
  type: string;
  opening_balance: number | null;
  notes: string | null;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  party_id: string | null;
  party_name: string | null;
  entry_date: string;
  kind: string;
  amount: number;
  description: string | null;
  invoice_id: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_no: string;
  invoice_date: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  sub_total: number;
  total: number;
  received: number;
  remaining: number;
  payment_mode: string | null;
  notes: string | null;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  quantity: number;
  description: string | null;
  size_label: string | null;
  square_feet: number;
  rate: number;
  amount: number;
}

export interface Labour {
  id: string;
  name: string;
  phone: string | null;
  category: string;
  custom_category: string | null;
  daily_wage: number | null;
  join_date: string | null;
  active: boolean;
  notes: string | null;
  created_at: string;
}

export interface Attendance {
  id: string;
  labour_id: string;
  labour_name: string | null;
  attendance_date: string;
  status: string;
  overtime_hours: number;
  note: string | null;
  created_at: string;
}

export interface WagePayment {
  id: string;
  labour_id: string;
  labour_name: string | null;
  payment_date: string;
  amount: number;
  period_from: string | null;
  period_to: string | null;
  note: string | null;
  created_at: string;
}

export interface Machinery {
  id: string;
  name: string;
  type: string;
  custom_type: string | null;
  model: string | null;
  status: string;
  purchase_date: string | null;
  cost: number | null;
  notes: string | null;
  created_at: string;
}

export interface Maintenance {
  id: string;
  machine_id: string;
  log_date: string;
  description: string | null;
  cost: number;
}

export interface MarbleType {
  id: string;
  name_ur: string;
  name_en: string;
  color_name: string | null;
  color_hex: string | null;
  cuts: string[] | null;
  notes: string | null;
  created_at: string;
}

export interface MarbleSize {
  id: string;
  label: string;
  length_in: number | null;
  width_in: number | null;
  unit: string;
  is_custom: boolean;
  notes: string | null;
}

export interface StockItem {
  id: string;
  marble_type_id: string | null;
  marble_type_name: string | null;
  size_id: string | null;
  size_label: string | null;
  color: string | null;
  quantity: number;
  square_feet: number;
  rate_per_sqft: number;
  location_note: string | null;
  updated_at: string;
}

export interface Expense {
  id: string;
  expense_date: string;
  category: string;
  custom_category: string | null;
  amount: number;
  description: string | null;
  created_at: string;
}

export interface AppSettings {
  id: string;
  lang: string;
  theme: string;
  default_rate_mode: string;
  invoice_prefix: string;
  next_invoice_no: number;
  show_bubbles: boolean;
  currency_label: string;
}
