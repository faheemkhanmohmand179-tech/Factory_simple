import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Eye, FileText, Plus } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ExportImportBar from '../../components/ui/ExportImportBar';
import { useToast } from '../../components/ui/Toast';
import { useLang } from '../../i18n';
import { useInvoices } from '../../hooks/useInvoices';
import { useCustomers } from '../../hooks/useCustomers';
import { supabase } from '../../lib/supabaseClient';
import type { Invoice, InvoiceItem } from '../../types';
import { fmtDate, fmtNum, num, todayStr, toLatinDigits } from '../../utils/format';
import { parseDateCell, parseNumCell, type ImportConfig } from '../../import/importExcel';
import { BillPreview, pdfBill, printBill, toBillData } from './InvoicePrint';
import { shareText } from '../../utils/share';
import { buildShareText } from '../../export/exportPdf';

type StatusFilter = 'all' | 'paid' | 'partial';

export default function InvoiceListPage() {
  const { t, lang, isUr } = useLang();
  const toast = useToast();
  const navigate = useNavigate();
  const { rows: invoices, items, loading, insert, update, insertItems, replaceItems, removeInvoice } = useInvoices();
  const { rows: customers } = useCustomers();

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [view, setView] = useState<Invoice | null>(null);
  const [del, setDel] = useState<Invoice | null>(null);

  const filtered = useMemo(() => {
    const needle = toLatinDigits(q.trim().toLowerCase());
    return [...invoices]
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .filter((i) => {
        if (status === 'paid' && num(i.remaining) > 0) return false;
        if (status === 'partial' && num(i.remaining) <= 0) return false;
        if (from && i.invoice_date < from) return false;
        if (to && i.invoice_date > to) return false;
        if (!needle) return true;
        return (
          i.invoice_no.toLowerCase().includes(needle) ||
          (i.customer_name ?? '').toLowerCase().includes(needle) ||
          (i.customer_phone ?? '').includes(needle)
        );
      });
  }, [invoices, q, status, from, to]);

  const totals = useMemo(
    () => ({
      total: filtered.reduce((s, i) => s + num(i.total), 0),
      received: filtered.reduce((s, i) => s + num(i.received), 0),
      remaining: filtered.reduce((s, i) => s + num(i.remaining), 0)
    }),
    [filtered]
  );

  const itemsOf = (invoiceId: string) => items.filter((it) => it.invoice_id === invoiceId);

  const doDelete = async () => {
    if (!del) return;
    try {
      await removeInvoice(del.id);
      toast.success(t('invoice.deleted'));
    } catch {
      toast.error(navigator.onLine ? t('toast.error') : t('toast.offline'));
    } finally {
      setDel(null);
    }
  };

  // ── import (template: نمبر | تاریخ | گاہک | تعداد | تفصیل | سائز | فٹواری | ریٹ | رقم | ٹوٹل | وصول | بقایا) ──
  const importCfg: ImportConfig = {
    columns: [
      { key: 'no', labels: ['نمبر', 'No'] },
      { key: 'date', labels: ['تاریخ', 'Date'] },
      { key: 'customer', labels: ['گاہک', 'Customer'] },
      { key: 'qty', labels: ['تعداد', 'Qty'] },
      { key: 'desc', labels: ['تفصیل', 'Description'] },
      { key: 'size', labels: ['سائز', 'Size'] },
      { key: 'sqft', labels: ['فٹواری', 'Sq Feet'] },
      { key: 'rate', labels: ['ریٹ', 'Rate'] },
      { key: 'amount', labels: ['رقم', 'Amount'] },
      { key: 'total', labels: ['ٹوٹل', 'Total'] },
      { key: 'received', labels: ['وصول', 'Received'] },
      { key: 'remaining', labels: ['بقایا', 'Remaining'] }
    ],
    example: {
      no: 'AF-0001',
      date: todayStr(),
      customer: isUr ? 'احمد خان' : 'Ahmad Khan',
      qty: 2,
      desc: isUr ? 'سفید ماربل' : 'White Marble',
      size: '24x24',
      sqft: 100,
      rate: 250,
      amount: 25000,
      total: 25000,
      received: 20000,
      remaining: 5000
    },
    mapRow: (raw) => {
      if (!raw.no && !raw.customer) return { error: t('invoice.customerRequired') };
      const d = parseDateCell(raw.date) ?? todayStr();
      const qty = parseNumCell(raw.qty) ?? 1;
      const sqft = parseNumCell(raw.sqft) ?? 0;
      const rate = parseNumCell(raw.rate) ?? 0;
      const amount = parseNumCell(raw.amount) ?? sqft * rate;
      const total = parseNumCell(raw.total) ?? amount;
      const received = parseNumCell(raw.received) ?? 0;
      const remaining = parseNumCell(raw.remaining) ?? total - received;
      const cust = customers.find((c) => c.name.trim().toLowerCase() === raw.customer.trim().toLowerCase());
      return {
        row: {
          invoice_no: raw.no || `IMP-${d}-${raw.customer}`,
          invoice_date: d,
          customer_id: cust?.id ?? null,
          customer_name: raw.customer,
          customer_phone: cust?.phone ?? null,
          sub_total: total,
          total,
          received,
          remaining,
          payment_mode: 'cash',
          notes: null,
          _item: { quantity: qty, description: raw.desc || null, size_label: raw.size || null, square_feet: sqft, rate, amount }
        }
      };
    },
    findDuplicate: (existing, mapped) => (existing as Invoice[]).find((i) => i.invoice_no === mapped.invoice_no),
    insertRows: async (rows) => {
      for (const r of rows) {
        const { _item, ...inv } = r as { _item: Record<string, unknown> } & Record<string, unknown>;
        const { data: created, error } = await supabase.from('invoices').insert(inv).select().single();
        if (error) throw error;
        await supabase.from('invoice_items').insert({ ..._item, invoice_id: created.id });
        if (created.customer_id) {
          await supabase.from('ledger_entries').insert([
            { party_id: created.customer_id, party_name: created.customer_name, entry_date: created.invoice_date, kind: 'farokht', amount: num(created.total), description: `بل ${created.invoice_no}`, invoice_id: created.id },
            ...(num(created.received) > 0
              ? [{ party_id: created.customer_id, party_name: created.customer_name, entry_date: created.invoice_date, kind: 'jama', amount: num(created.received), description: `وصول ${created.invoice_no}`, invoice_id: created.id }]
              : [])
          ]);
        }
      }
    },
    updateRow: async (existing, mapped) => {
      const { _item, ...inv } = mapped as { _item: Record<string, unknown> } & Record<string, unknown>;
      await update((existing as Invoice).id, inv);
      const itemsRow = [_item] as unknown as Partial<InvoiceItem>[];
      await replaceItems((existing as Invoice).id, itemsRow);
    }
  };

  const filters: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: t('invoice.filterAll') },
    { key: 'paid', label: t('invoice.filterPaid') },
    { key: 'partial', label: t('invoice.filterPartial') }
  ];

  return (
    <div>
      <PageHeader
        title={t('invoice.allBills')}
        count={filtered.length}
        addLabel={t('dashboard.newBill')}
        onAdd={() => navigate('/invoice/new')}
        search={{ value: q, onChange: setQ }}
      >
        {filters.map((f) => (
          <button key={f.key} type="button" onClick={() => setStatus(f.key)} className={`chip ${status === f.key ? 'chip-active' : ''}`}>
            <span className={isUr ? 'font-urdu' : ''}>{f.label}</span>
          </button>
        ))}
        <input type="date" dir="ltr" value={from} onChange={(e) => setFrom(e.target.value)} className="input !h-11 !py-0 bg-white/90 tabular-nums text-sm" title={t('invoice.dateFrom')} />
        <input type="date" dir="ltr" value={to} onChange={(e) => setTo(e.target.value)} className="input !h-11 !py-0 bg-white/90 tabular-nums text-sm" title={t('invoice.dateTo')} />
      </PageHeader>

      <DataTable
        loading={loading}
        rows={filtered}
        columns={[
          { key: 'invoice_no', label: t('invoice.no'), render: (i) => <span dir="ltr" className="font-bold tabular-nums">{i.invoice_no}</span> },
          { key: 'invoice_date', label: t('common.date'), render: (i) => <span dir="ltr" className="tabular-nums">{fmtDate(i.invoice_date)}</span> },
          { key: 'customer_name', label: t('invoice.buyer'), render: (i) => <span className={isUr ? 'font-urdu' : ''}>{i.customer_name || '—'}</span> },
          { key: 'total', label: t('common.total'), align: 'right', render: (i) => <span className="font-extrabold">{fmtNum(i.total)}</span> },
          { key: 'received', label: t('common.received'), align: 'right', render: (i) => <span className="text-emerald-700 font-bold">{fmtNum(i.received)}</span> },
          {
            key: 'remaining',
            label: t('common.remaining'),
            align: 'right',
            render: (i) => (
              <span className={`font-extrabold ${num(i.remaining) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{fmtNum(i.remaining)}</span>
            )
          },
          {
            key: 'status',
            label: t('common.status'),
            render: (i) => (
              <span className={`chip ${num(i.remaining) <= 0 ? 'chip-paid' : 'chip-partial'} ${isUr ? 'font-urdu' : ''}`}>
                {num(i.remaining) <= 0 ? t('invoice.paid') : t('invoice.partial')}
              </span>
            )
          }
        ]}
        extraActions={(i) => (
          <>
            <button
              type="button"
              title={t('invoice.viewBill')}
              onClick={() => setView(i)}
              className="h-11 w-11 grid place-items-center rounded-xl bg-violet-100 text-violet-600 hover:bg-violet-200 transition active:scale-95"
            >
              <Eye className="h-4.5 w-4.5" />
            </button>
            <button
              type="button"
              title={t('invoice.duplicateBill')}
              onClick={() => navigate('/invoice/new', { state: { clone: i } })}
              className="h-11 w-11 grid place-items-center rounded-xl bg-amber-100 text-amber-600 hover:bg-amber-200 transition active:scale-95"
            >
              <Copy className="h-4.5 w-4.5" />
            </button>
          </>
        )}
        onEdit={(i) => navigate(`/invoice/edit/${i.id}`)}
        onDelete={(i) => setDel(i)}
        emptyTitle={t('common.noRecords')}
        emptyHint={t('common.noRecordsHint')}
        emptyActionLabel={t('dashboard.newBill')}
        onEmptyAction={() => navigate('/invoice/new')}
        footer={
          <tr>
            <td className="px-4 py-3.5">{t('common.total')} ({filtered.length})</td>
            <td colSpan={2} />
            <td className="px-4 py-3.5 text-end tabular-nums">{fmtNum(totals.total)}</td>
            <td className="px-4 py-3.5 text-end tabular-nums text-emerald-700">{fmtNum(totals.received)}</td>
            <td className="px-4 py-3.5 text-end tabular-nums text-rose-600">{fmtNum(totals.remaining)}</td>
            <td />
            <td />
          </tr>
        }
      />

      <div className="mt-4">
        <ExportImportBar
          title={t('invoice.allBills')}
          filenameBase="bills"
          importCfg={importCfg}
          columns={[
            { key: 'invoice_no', label: t('invoice.no') },
            { key: 'invoice_date', label: t('common.date'), get: (i) => fmtDate(i.invoice_date) },
            { key: 'customer_name', label: t('invoice.buyer'), get: (i) => i.customer_name ?? '' },
            { key: 'total', label: t('common.total'), align: 'right', get: (i) => fmtNum(i.total) },
            { key: 'received', label: t('common.received'), align: 'right', get: (i) => fmtNum(i.received) },
            { key: 'remaining', label: t('common.remaining'), align: 'right', get: (i) => fmtNum(i.remaining) }
          ]}
          rows={filtered as unknown as Record<string, unknown>[]}
          summary={[
            { label: t('common.total'), value: fmtNum(totals.total) },
            { label: t('common.received'), value: fmtNum(totals.received) },
            { label: t('common.remaining'), value: fmtNum(totals.remaining) }
          ]}
        />
      </div>

      {/* view modal */}
      <Modal
        open={Boolean(view)}
        onClose={() => setView(null)}
        title={`${t('invoice.viewTitle')} — ${view?.invoice_no ?? ''}`}
        wide
        footer={
          view && (
            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="pdf" size="sm" icon={FileText} onClick={() => void pdfBill(toBillData(view), itemsOf(view.id), lang)}>
                {t('invoice.downloadPdf')}
              </Button>
              <Button
                variant="whatsapp"
                size="sm"
                onClick={() =>
                  void shareText(
                    buildShareText({
                      title: `${t('invoice.bill')} ${view.invoice_no}`,
                      columns: [
                        { label: t('common.description') },
                        { label: t('stock.sqft'), align: 'right' },
                        { label: t('common.rate'), align: 'right' },
                        { label: t('common.amount'), align: 'right' }
                      ],
                      rows: itemsOf(view.id).map((it) => [it.description ?? '', it.square_feet, it.rate, it.amount]),
                      summary: [
                        { label: t('common.total'), value: fmtNum(view.total) },
                        { label: t('common.received'), value: fmtNum(view.received) },
                        { label: t('common.remaining'), value: fmtNum(view.remaining) }
                      ],
                      lang
                    })
                  )
                }
              >
                {t('invoice.shareWa')}
              </Button>
              <Button variant="info" size="sm" icon={Plus} onClick={() => void printBill(toBillData(view), itemsOf(view.id), lang)}>
                {t('invoice.printBill')}
              </Button>
              <Button variant="primary" size="sm" onClick={() => navigate(`/invoice/edit/${view.id}`)}>
                {t('invoice.editBill')}
              </Button>
            </div>
          )
        }
      >
        {view && <BillPreview inv={toBillData(view)} items={itemsOf(view.id)} lang={lang} />}
      </Modal>

      <ConfirmDialog
        open={Boolean(del)}
        title={t('common.confirmDeleteTitle')}
        message={t('invoice.deleteConfirm')}
        confirmLabel={t('common.delete')}
        onConfirm={doDelete}
        onClose={() => setDel(null)}
      />
    </div>
  );
}
