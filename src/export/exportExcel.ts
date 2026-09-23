import * as XLSX from 'xlsx';
import { letterheadLines } from '../lib/factory';
import { todayStr } from '../utils/format';
import type { Lang } from '../types';
import type { ExportSpec } from './exportPdf';

/** Excel export with factory letterhead rows on top. RTL sheet view for Urdu. */
export function exportExcel(spec: ExportSpec, filename: string): void {
  const aoa: (string | number)[][] = [];
  for (const line of letterheadLines(spec.lang)) aoa.push([line]);
  aoa.push([]);
  aoa.push([spec.title, '', '', `Date: ${todayStr()}`]);
  aoa.push([]);
  aoa.push(spec.columns.map((c) => c.label));
  for (const r of spec.rows) aoa.push(r.map((v) => (typeof v === 'number' ? v : String(v))));
  aoa.push([]);
  for (const s of spec.summary ?? []) aoa.push([s.label, '', '', s.value]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // column widths: rough estimate from longest cell
  const colCount = Math.max(spec.columns.length, ...spec.rows.map((r) => r.length), 4);
  ws['!cols'] = Array.from({ length: colCount }, (_, i) => {
    let max = 10;
    for (const r of aoa) {
      const cell = r[i];
      if (cell !== undefined && cell !== null) max = Math.max(max, String(cell).length + 3);
    }
    return { wch: Math.min(max, 45) };
  });

  const wb = XLSX.utils.book_new();
  if (spec.lang === 'ur') {
    wb.Workbook = { Views: [{ RTL: true }] };
  }
  XLSX.utils.book_append_sheet(wb, ws, spec.lang === 'ur' ? 'رپورٹ' : 'Report');
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}
