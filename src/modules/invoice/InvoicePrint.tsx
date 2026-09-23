import type { Invoice, InvoiceItem, Lang } from '../../types';
import { FACTORY } from '../../lib/factory';
import { fmtNum, num } from '../../utils/format';
import { esc, letterheadHtml, htmlToPdf, printHtml, BASE_CSS } from '../../export/exportPdf';

// ─────────────────────────────────────────────────────────────────────
// Bill sheet (A5): letterhead + بنام / نمبر / تاریخ + items table +
// totals + signature. One HTML builder shared by screen preview,
// window.print and the html2canvas→jsPDF export (correct Nastaliq).
// ─────────────────────────────────────────────────────────────────────

export interface BillItem {
  quantity: number;
  description: string | null;
  size_label: string | null;
  square_feet: number;
  rate: number;
  amount: number;
}

export interface BillData {
  invoice_no: string;
  invoice_date: string;
  customer_name: string | null;
  customer_phone: string | null;
  sub_total: number;
  total: number;
  received: number;
  remaining: number;
  payment_mode: string | null;
  notes: string | null;
}

export function billHtml(inv: BillData, items: BillItem[], lang: Lang): string {
  const ur = lang === 'ur';
  const rowsHtml = items
    .map(
      (it) => `<tr>
        <td class="c num">${esc(fmtNum(it.quantity))}</td>
        <td class="${ur ? 'ur' : ''}">${esc(it.description || '—')}</td>
        <td class="${ur ? 'ur' : ''}">${esc(it.size_label || '—')}</td>
        <td class="r num">${esc(fmtNum(it.square_feet))}</td>
        <td class="r num">${esc(fmtNum(it.rate))}</td>
        <td class="r num"><b>${esc(fmtNum(it.amount))}</b></td>
      </tr>`
    )
    .join('');

  const totalRows = `
    <div class="trow"><span class="${ur ? 'ur' : ''}">${esc(ur ? 'ٹوٹل' : 'Total')}</span><span class="num">${esc(fmtNum(inv.total))}</span></div>
    <div class="trow"><span class="${ur ? 'ur' : ''}">${esc(ur ? 'وصول' : 'Received')}</span><span class="num">${esc(fmtNum(inv.received))}</span></div>
    <div class="trow ${num(inv.remaining) > 0 ? 'rem' : 'ok'}"><span class="${ur ? 'ur' : ''}">${esc(ur ? 'بقایا' : 'Remaining')}</span><span class="num">${esc(fmtNum(inv.remaining))}</span></div>`;

  return `<!doctype html><html><head><meta charset="utf-8"/><style>
    ${BASE_CSS}
    .page { padding: 26px 28px; }
    .bill-head { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; background: #f5f3ff; border: 1.5px solid #ddd6fe; border-radius: 12px; padding: 10px 14px; margin: 12px 0; font-size: 13px; }
    .bill-head .cell { min-width: 130px; }
    .bill-head .lbl { font-weight: 800; color: #6d28d9; }
    .trow.rem { color: #be123c; font-weight: 800; }
    .trow.ok { color: #047857; font-weight: 800; }
  </style></head>
<body><div class="page ${ur ? 'rtl' : ''}" style="width: 100%">
  ${letterheadHtml(lang, true)}
  <hr class="rule"/>
  <div class="bill-head">
    <div class="cell"><span class="lbl ${ur ? 'ur' : ''}">${esc(ur ? 'بنام' : 'Buyer')}:</span> <span class="${ur ? 'ur' : ''}" style="font-weight:800">${esc(inv.customer_name || '—')}</span></div>
    <div class="cell"><span class="lbl ${ur ? 'ur' : ''}">${esc(ur ? 'نمبر' : 'No.')}:</span> <span class="num">${esc(inv.invoice_no)}</span></div>
    <div class="cell"><span class="lbl ${ur ? 'ur' : ''}">${esc(ur ? 'تاریخ' : 'Date')}:</span> <span class="num">${esc(inv.invoice_date)}</span></div>
  </div>
  <table>
    <thead>
      <tr>
        <th class="c">${esc(ur ? 'تعداد' : 'Qty')}</th>
        <th>${esc(ur ? 'تفصیل' : 'Description')}</th>
        <th>${esc(ur ? 'سائز' : 'Size')}</th>
        <th class="r">${esc(ur ? 'فٹواری' : 'Sq Feet')}</th>
        <th class="r">${esc(ur ? 'ریٹ' : 'Rate')}</th>
        <th class="r">${esc(ur ? 'رقم' : 'Amount')}</th>
      </tr>
    </thead>
    <tbody>${rowsHtml || `<tr><td colspan="6" class="c">—</td></tr>`}</tbody>
  </table>
  <div class="totals">${totalRows}</div>
  ${inv.notes ? `<p class="${ur ? 'ur' : ''}" style="margin-top:14px;font-size:12px;color:#374151"><b>${esc(ur ? 'نوٹ' : 'Notes')}:</b> ${esc(inv.notes)}</p>` : ''}
  <div class="sig"><span class="line ${ur ? 'ur' : ''}">${esc(ur ? 'دستخط' : 'Signature')}</span></div>
  <div class="foot">${esc(FACTORY.nameEn)} · ${esc(FACTORY.phone1Ur)} | ${esc(FACTORY.phone2Ur)}</div>
</div></body></html>`;
}

/** Print the bill (browser shapes Urdu natively) */
export async function printBill(inv: BillData, items: BillItem[], lang: Lang): Promise<void> {
  await printHtml(billHtml(inv, items, lang), 'a5');
}

/** PDF the bill via html2canvas → jsPDF A5 (guarantees correct Nastaliq) */
export async function pdfBill(inv: BillData, items: BillItem[], lang: Lang): Promise<void> {
  await htmlToPdf(billHtml(inv, items, lang), `bill-${inv.invoice_no}.pdf`, 'a5');
}

/** On-screen white-sheet preview (view modal / after save) */
export function BillPreview({ inv, items, lang }: { inv: BillData; items: BillItem[]; lang: Lang }) {
  const body = billHtml(inv, items, lang)
    .replace(/^[\s\S]*?<body>/, '')
    .replace(/<\/body>[\s\S]*$/, '');
  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white" dir={lang === 'ur' ? 'rtl' : 'ltr'}>
      <div className="bg-white overflow-x-auto scroll-slim" dangerouslySetInnerHTML={{ __html: `<style>${BASE_CSS} .page{background:#fff}</style>${body}` }} />
    </div>
  );
}

/** DB invoice + items → BillData (used everywhere) */
export function toBillData(inv: Invoice): BillData {
  return {
    invoice_no: inv.invoice_no,
    invoice_date: inv.invoice_date,
    customer_name: inv.customer_name,
    customer_phone: inv.customer_phone,
    sub_total: num(inv.sub_total),
    total: num(inv.total),
    received: num(inv.received),
    remaining: num(inv.remaining),
    payment_mode: inv.payment_mode,
    notes: inv.notes
  };
}
