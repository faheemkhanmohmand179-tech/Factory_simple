import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { Lang } from '../types';
import { FACTORY, letterheadLines } from '../lib/factory';
import { todayStr } from '../utils/format';

// ─────────────────────────────────────────────────────────────────────
// PDF ENGINE — jsPDF cannot shape Urdu/Arabic glyphs, so every export is
// rendered as hidden HTML (correct Nastaliq via browser text shaping)
// and rasterized with html2canvas at scale 3, then embedded as a full
// A4 (reports) or A5 (bills) page. Digits stay Latin (1234 style).
// ─────────────────────────────────────────────────────────────────────

export interface ExportColSpec {
  label: string;
  align?: 'left' | 'right' | 'center';
}

export interface ExportSpec {
  title: string;
  columns: ExportColSpec[];
  rows: (string | number)[][];
  summary?: { label: string; value: string }[];
  lang: Lang;
  signature?: boolean;
}

export function esc(v: unknown): string {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export const BASE_CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; }
  .page { background: #ffffff; color: #111827; padding: 34px 38px; font-family: 'Inter', 'Segoe UI', Arial, sans-serif; }
  .page.rtl { direction: rtl; }
  .num { font-family: 'Inter', Arial, sans-serif; }
  .lh { text-align: center; margin-bottom: 8px; }
  .lh .name-ur { font-family: 'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Noto Naskh Arabic', serif; font-size: 30px; font-weight: 700; color: #111827; padding-top: 14px; line-height: 2.4; }
  .lh .name-en { font-size: 14px; font-weight: 800; letter-spacing: 5px; color: #6d28d9; margin-top: 4px; }
  .lh .tag { font-family: 'Noto Nastaliq Urdu', 'Noto Naskh Arabic', serif; font-size: 15px; color: #374151; padding-top: 8px; line-height: 2.2; }
  .lh .meta { font-size: 12px; color: #4b5563; margin-top: 6px; line-height: 2; }
  .lh .meta b { color: #111827; }
  .rule { height: 3px; background: linear-gradient(90deg, transparent, #7c3aed, #db2777, transparent); border: 0; margin: 12px 0 18px; }
  h2.title { text-align: center; font-size: 19px; font-weight: 800; color: #1e1b4b; margin: 0 0 4px; }
  .sub { text-align: center; font-size: 11px; color: #6b7280; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  th { background: linear-gradient(90deg, #4f46e5, #7c3aed); color: #ffffff; padding: 9px 10px; border: 1px solid #4338ca; font-weight: 700; }
  td { border: 1px solid #d1d5db; padding: 8px 10px; color: #111827; }
  tr:nth-child(even) td { background: #f5f3ff; }
  .ur { font-family: 'Noto Nastaliq Urdu', 'Noto Naskh Arabic', serif; padding-top: 6px; line-height: 2.1; }
  .r { text-align: right; font-family: 'Inter', Arial, sans-serif; }
  .c { text-align: center; }
  .totals { margin-top: 18px; max-width: 330px; margin-left: auto; margin-right: 0; }
  .rtl .totals { margin-left: 0; margin-right: auto; }
  .totals .trow { display: flex; justify-content: space-between; gap: 18px; padding: 7px 14px; border-bottom: 1px dashed #c7d2fe; font-size: 13px; }
  .totals .trow.grand { background: linear-gradient(90deg, #eef2ff, #f5f3ff); border-radius: 10px; border: 2px solid #7c3aed; font-weight: 800; font-size: 15px; padding: 10px 14px; }
  .sig { margin-top: 56px; text-align: left; }
  .rtl .sig { text-align: right; }
  .sig .line { display: inline-block; border-top: 2px dotted #374151; padding: 6px 42px 0; font-size: 13px; font-weight: 700; }
  .foot { margin-top: 26px; text-align: center; font-size: 10.5px; color: #9ca3af; }
`;

/** Shared letterhead block (used by report HTML and the bill HTML) */
export function letterheadHtml(lang: Lang, compact = false): string {
  const tagSize = compact ? 13 : 15;
  return `
  <div class="lh">
    <div class="name-ur" style="font-size:${compact ? 24 : 30}px">${esc(FACTORY.nameUr)}</div>
    <div class="name-en">${esc(FACTORY.nameEn)}</div>
    <div class="tag" style="font-size:${tagSize}px">${esc(FACTORY.line1Ur)} — ${esc(FACTORY.line2Ur)}</div>
    <div class="meta">
      <b>${esc(lang === 'ur' ? 'پتہ' : 'Address')}:</b> ${esc(lang === 'ur' ? FACTORY.addressUr : FACTORY.addressEn)}<br/>
      <b>${esc(lang === 'ur' ? 'پروپرائیٹر' : 'Proprietors')}:</b> ${esc(lang === 'ur' ? FACTORY.proprietorsUr : FACTORY.proprietorsEn)}<br/>
      <span class="num">${esc(FACTORY.phone1Ur)} &nbsp;|&nbsp; ${esc(FACTORY.phone2Ur)}</span>
    </div>
  </div>`;
}

/** Styled letterhead + title + table + totals + signature (full report page) */
export function buildTableHtml(spec: ExportSpec): string {
  const ur = spec.lang === 'ur';
  const alignCls = (a?: string) => (a === 'right' ? 'r' : a === 'center' ? 'c' : ur ? '' : '');
  const head = spec.columns.map((c) => `<th class="${alignCls(c.align)} ${ur ? 'ur' : ''}">${esc(c.label)}</th>`).join('');
  const body = spec.rows
    .map(
      (r) =>
        `<tr>${r
          .map((v, i) => `<td class="${alignCls(spec.columns[i]?.align)} ${ur ? 'ur' : ''}">${esc(v)}</td>`)
          .join('')}</tr>`
    )
    .join('');

  const summary = (spec.summary ?? [])
    .map((s, i) =>
      i === (spec.summary ?? []).length - 1
        ? `<div class="trow grand"><span class="${ur ? 'ur' : ''}">${esc(s.label)}</span><span class="num">${esc(s.value)}</span></div>`
        : `<div class="trow"><span class="${ur ? 'ur' : ''}">${esc(s.label)}</span><span class="num">${esc(s.value)}</span></div>`
    )
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"/><style>${BASE_CSS}</style></head>
<body><div class="page ${ur ? 'rtl' : ''}">
  ${letterheadHtml(spec.lang)}
  <hr class="rule"/>
  <h2 class="title ${ur ? 'ur' : ''}">${esc(spec.title)}</h2>
  <div class="sub num">${esc(todayStr())}</div>
  <table>
    <thead><tr>${head}</tr></thead>
    <tbody>${body || `<tr><td colspan="${spec.columns.length}" class="c ${ur ? 'ur' : ''}">—</td></tr>`}</tbody>
  </table>
  ${summary ? `<div class="totals">${summary}</div>` : ''}
  ${spec.signature === false ? '' : `<div class="sig"><span class="line ${ur ? 'ur' : ''}">${esc(ur ? 'دستخط' : 'Signature')}</span></div>`}
  <div class="foot">${esc(FACTORY.nameEn)} · ${esc(FACTORY.phone1)} | ${esc(FACTORY.phone2)}</div>
</div></body></html>`;
}

const PAPER_WIDTH_PX = { a4: 794, a5: 560 } as const;

/** Rasterize HTML → PNG (scale 3) → jsPDF full-page image (multi-page slicing) */
export async function htmlToPdf(html: string, filename: string, paper: 'a4' | 'a5' = 'a4'): Promise<void> {
  const holder = document.createElement('div');
  holder.setAttribute('aria-hidden', 'true');
  holder.style.cssText = `position:fixed;left:-99999px;top:0;width:${PAPER_WIDTH_PX[paper]}px;background:#ffffff;`;
  holder.innerHTML = html;
  document.body.appendChild(holder);

  try {
    try {
      await (document as Document & { fonts?: FontFaceSet }).fonts?.ready;
    } catch {
      /* fonts API unavailable */
    }
    await new Promise((r) => window.setTimeout(r, 350));
    const canvas = await html2canvas(holder.firstElementChild as HTMLElement, {
      scale: 3,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false
    });

    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: paper });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const imgH = (canvas.height * pageW) / canvas.width;
    const pages = Math.max(1, Math.ceil(imgH / pageH));
    const img = canvas.toDataURL('image/png');
    for (let i = 0; i < pages; i++) {
      if (i > 0) doc.addPage();
      doc.addImage(img, 'PNG', 0, -i * pageH, pageW, imgH);
    }
    doc.save(filename);
  } finally {
    holder.remove();
  }
}

/** Print any HTML through the hidden #print-root node (browser shapes Urdu natively) */
export async function printHtml(html: string, paper: 'a4' | 'a5' = 'a4'): Promise<void> {
  const root = document.getElementById('print-root');
  if (!root) return;
  let styleTag = document.getElementById('print-page-rule') as HTMLStyleElement | null;
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = 'print-page-rule';
    document.head.appendChild(styleTag);
  }
  styleTag.textContent = `@page { size: ${paper}; margin: 8mm; }`;
  root.innerHTML = html;
  try {
    await (document as Document & { fonts?: FontFaceSet }).fonts?.ready;
  } catch {
    /* ignore */
  }
  await new Promise((r) => window.setTimeout(r, 350));
  window.print();
  window.setTimeout(() => {
    root.innerHTML = '';
  }, 1200);
}

/** Plain-text letterhead + table + summary (WhatsApp shares) */
export function buildShareText(spec: ExportSpec, maxRows = 30): string {
  const lines = [...letterheadLines(spec.lang), '', `*${spec.title}*`, ''];
  const shown = spec.rows.slice(0, maxRows);
  for (const r of shown) {
    lines.push(spec.columns.map((c, i) => `${c.label}: ${r[i]}`).join(' | '));
  }
  if (spec.rows.length > shown.length) lines.push(`… +${spec.rows.length - shown.length}`);
  if (spec.summary?.length) {
    lines.push('', '——————————');
    for (const s of spec.summary) lines.push(`${s.label}: ${s.value}`);
  }
  return lines.join('\n');
}
