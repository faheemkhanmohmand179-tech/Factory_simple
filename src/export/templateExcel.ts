import * as XLSX from 'xlsx';
import type { Lang } from '../types';
import type { ImportConfig } from '../import/importExcel';

/**
 * Blank prototype .xlsx per section:
 *   Sheet 1 "ڈیٹا / Data"        → exact column headers + one example row
 *   Sheet 2 "ہدایات / Instructions" → simple Urdu + English how-to
 */
export function downloadTemplate(title: string, cfg: ImportConfig, lang: Lang): void {
  const labels = cfg.columns.map((c) => (lang === 'ur' ? c.labels[0] : c.labels[1]));
  const exampleRow = cfg.columns.map((c) => {
    const v = cfg.example[c.key];
    return v === undefined ? '' : v;
  });

  const dataSheet = XLSX.utils.aoa_to_sheet([labels, exampleRow]);
  dataSheet['!cols'] = labels.map((l) => ({ wch: Math.max(14, String(l).length + 4) }));

  const instructions: string[][] = [
    ['ہدایات / Instructions', ''],
    [''],
    ['اردو', 'English'],
    ['اپنا ڈیٹا پہلی شیٹ (ڈیٹا) میں درج کریں۔', 'Enter your data in the first sheet (Data).'],
    ['ہیڈر کی قطار (پہلی قطار) تبدیل نہ کریں۔', 'Do not change the header row (first row).'],
    ['تاریخ اس طرح لکھیں: 15-01-2025 یا 2025-01-15', 'Write dates like: 15-01-2025 or 2025-01-15'],
    ['رقم میں صرف نمبر لکھیں (12,500 نہیں — 12500)۔', 'Write plain numbers only (12500, not 12,500).'],
    ['جس قطار میں نام یا تاریخ خالی ہو وہ درآمد نہیں ہوگی۔', 'Rows with empty name or date will not import.'],
    ['درآمد سے پہلے پیش نظارہ میں ہر قطار چیکر ہوگی۔', 'Every row is checked in the preview before importing.'],
    ['ڈپلیکٹ ریکارڈ پر ایپ پوچھے گی کہ چھوڑ دیں یا اپ ڈیٹ کریں۔', 'For duplicates the app asks to skip or update.'],
    ['فائل بھرنے کے بعد "درآمد" میں یہی فائل منتخب کریں۔', 'After filling, choose this file in the Import step.']
  ];
  const infoSheet = XLSX.utils.aoa_to_sheet(instructions);
  infoSheet['!cols'] = [{ wch: 52 }, { wch: 60 }];

  const wb = XLSX.utils.book_new();
  if (lang === 'ur') wb.Workbook = { Views: [{ RTL: true }] };
  XLSX.utils.book_append_sheet(wb, dataSheet, lang === 'ur' ? 'ڈیٹا / Data' : 'Data');
  XLSX.utils.book_append_sheet(wb, infoSheet, 'ہدایات / Instructions');
  XLSX.writeFile(wb, `${title}-template.xlsx`);
}
