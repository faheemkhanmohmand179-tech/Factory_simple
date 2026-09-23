import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { toLatinDigits } from '../utils/format';

// ─────────────────────────────────────────────────────────────────────
// IMPORT ENGINE — parse a filled template (.xlsx / .xls / .csv),
// match headers tolerantly (Urdu OR English, spaces, case), validate
// every row, then hand the mapped rows back to the caller.
// ─────────────────────────────────────────────────────────────────────

export interface ImportColumn {
  key: string;
  /** [urduLabel, englishLabel] — both accepted when matching headers */
  labels: [string, string];
}

export interface MappedRow {
  raw: Record<string, string>;
  row?: Record<string, unknown>;
  error?: string;
}

export interface ParseResult {
  okCount: number;
  badCount: number;
  results: MappedRow[];
  fatal?: string;
}

export interface ImportConfig {
  columns: ImportColumn[];
  example: Record<string, string | number>;
  /** validate + shape one raw row → db row OR an error reason */
  mapRow: (raw: Record<string, string>) => { row?: Record<string, unknown>; error?: string };
  /** find the same record among existing rows (duplicate detection) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  findDuplicate?: (existing: any[], mapped: any) => any;
  /** batch insert of the valid, non-duplicate rows */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  insertRows: (rows: any[]) => Promise<void>;
  /** how to update an existing duplicate (optional — enables "update" choice) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateRow?: (existing: any, mapped: any) => Promise<void>;
}

/** normalize a header cell: lowercase, strip spaces/underscores/punct */
export function normHeader(s: unknown): string {
  return toLatinDigits(String(s ?? ''))
    .toLowerCase()
    .replace(/[\s_\-–:：()（）/\\.,،؟?'"*#]+/g, '')
    .trim();
}

/** tolerant date parser → YYYY-MM-DD (or null) */
export function parseDateCell(v: unknown): string | null {
  const s = toLatinDigits(String(v ?? '').trim());
  if (!s) return null;
  const formats = ['YYYY-MM-DD', 'DD-MM-YYYY', 'DD/MM/YYYY', 'D/M/YYYY', 'D-M-YYYY', 'DD.MM.YYYY', 'YYYY/MM/DD', 'YYYY.MM.DD', 'M/D/YYYY'];
  for (const f of formats) {
    const d = dayjs(s, f, true);
    if (d.isValid()) return d.format('YYYY-MM-DD');
  }
  const auto = dayjs(s);
  return auto.isValid() ? auto.format('YYYY-MM-DD') : null;
}

/** tolerant number parser → number (or null when not numeric) */
export function parseNumCell(v: unknown): number | null {
  const s = toLatinDigits(String(v ?? '').trim()).replace(/[,\s]/g, '').replace(/روپے|Rs\.?/gi, '');
  if (s === '') return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/** Parse a filled template file → validated rows (uses cfg.mapRow per row) */
export async function parseImportFile(file: File, cfg: ImportConfig): Promise<ParseResult> {
  const buf = await file.arrayBuffer();
  let aoa: unknown[][];
  try {
    const wb = XLSX.read(buf, { type: 'array' });
    const sheetName = wb.SheetNames.find((n) => !n.includes('ہدایات') && !n.toLowerCase().includes('instruc')) ?? wb.SheetNames[0];
    aoa = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], { header: 1, defval: '', raw: false });
  } catch {
    return { okCount: 0, badCount: 0, results: [], fatal: 'read-error' };
  }

  // Build lookup: normalized label → column key (both Urdu and English labels)
  const labelMap = new Map<string, string>();
  for (const col of cfg.columns) {
    labelMap.set(normHeader(col.labels[0]), col.key);
    labelMap.set(normHeader(col.labels[1]), col.key);
  }

  // Find the header row within the first 6 rows: needs ≥2 recognized labels
  let headerIdx = -1;
  let colMap = new Map<number, string>();
  for (let i = 0; i < Math.min(6, aoa.length); i++) {
    const map = new Map<number, string>();
    for (let j = 0; j < (aoa[i]?.length ?? 0); j++) {
      const key = labelMap.get(normHeader(aoa[i][j]));
      if (key && ![...map.values()].includes(key)) map.set(j, key);
    }
    if (map.size >= 2) {
      headerIdx = i;
      colMap = map;
      break;
    }
  }
  if (headerIdx < 0) return { okCount: 0, badCount: 0, results: [], fatal: 'header-not-found' };

  const results: MappedRow[] = [];
  let okCount = 0;
  let badCount = 0;

  for (let i = headerIdx + 1; i < aoa.length; i++) {
    const arr = aoa[i] ?? [];
    // skip fully empty rows
    if (!arr.some((c) => String(c ?? '').trim() !== '')) continue;

    const raw: Record<string, string> = {};
    for (const [colIdx, key] of colMap) raw[key] = String(arr[colIdx] ?? '').trim();

    // skip the example row from our own template
    if (
      cfg.columns.every((c) => {
        const ex = String(cfg.example[c.key] ?? '');
        return raw[c.key] === '' || raw[c.key] === ex;
      })
    ) {
      continue;
    }

    const mapped = cfg.mapRow(raw);
    if (mapped.error || !mapped.row) {
      results.push({ raw, error: mapped.error ?? 'invalid' });
      badCount++;
    } else {
      results.push({ raw, row: mapped.row });
      okCount++;
    }
  }

  if (results.length === 0) return { okCount: 0, badCount: 0, results: [], fatal: 'empty' };
  return { okCount, badCount, results };
}
