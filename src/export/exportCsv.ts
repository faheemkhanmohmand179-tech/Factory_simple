import Papa from 'papaparse';
import { letterheadLines } from '../lib/factory';
import { todayStr } from '../utils/format';
import type { ExportSpec } from './exportPdf';

/**
 * CSV export with UTF-8 BOM so Urdu opens correctly in Excel
 * (File → Import or direct open keeps نستعلیق readable).
 */
export function exportCsv(spec: ExportSpec, filename: string): void {
  const rows: (string | number)[][] = [];
  for (const line of letterheadLines(spec.lang)) rows.push([line]);
  rows.push([]);
  rows.push([spec.title, '', '', `Date: ${todayStr()}`]);
  rows.push([]);
  rows.push(spec.columns.map((c) => c.label));
  for (const r of spec.rows) rows.push(r);
  rows.push([]);
  for (const s of spec.summary ?? []) rows.push([s.label, '', '', s.value]);

  const csv = Papa.unparse(rows, { delimiter: ',' });
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
