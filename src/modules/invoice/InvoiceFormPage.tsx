import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Boxes, FileDown, FileSpreadsheet, FileText, FileType2, MessageCircle, Plus, Printer, Table, Trash2, X } from 'lucide-react';
import FactoryHeader from '../../components/FactoryHeader';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { useLang } from '../../i18n';
import { useInvoices } from '../../hooks/useInvoices';
import { useCustomers } from '../../hooks/useCustomers';
import { useMarbleTypes } from '../../hooks/useMarbleTypes';
import { useMarbleSizes } from '../../hooks/useMarbleSizes';
import { useStock } from '../../hooks/useStock';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../lib/supabaseClient';
import { PAYMENT_MODES, type Invoice } from '../../types';
import { fmtNum, num, todayStr, toLatinDigits } from '../../utils/format';
import { nextInvoiceNo } from '../../utils/id';
import { shareText } from '../../utils/share';
import { buildShareText } from '../../export/exportPdf';
import { exportExcel } from '../../export/exportExcel';
import { exportWord } from '../../export/exportWord';
import { exportCsv } from '../../export/exportCsv';
import { pdfBill, printBill, type BillData } from './InvoicePrint';

let itemSeq = 1;

interface Row {
  _id: number;
  quantity: string;
  description: string;
  size_label: string;
  square_feet: string;
  rate: string;
}

const emptyRow = (): Row => ({
  _id: itemSeq++,
  quantity: '1',
  description: '',
  size_label: '',
  square_feet: '',
  rate: ''
});

export default function InvoiceFormPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, lang, isUr } = useLang();
  const toast = useToast();
  const rateMode = useAppStore((s) => s.rateMode);
  const setRateMode = useAppStore((s) => s.setRateMode);
  const invoicePrefix = useAppStore((s) => s.invoicePrefix);

  const { rows: invoices, items, loading, insert, update, replaceItems } = useInvoices();
  const { rows: customers } = useCustomers();
  const { rows: marbleTypes } = useMarbleTypes();
  const { rows: marbleSizes } = useMarbleSizes();
  const { rows: stock } = useStock();

  const editing = Boolean(id);
  const clone = (location.state as { clone?: Invoice } | null)?.clone ?? null;

  // header fields
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(todayStr());
  const [customerId, setCustomerId] = useState('');
  const [customName, setCustomName] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [received, setReceived] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [saveErr, setSaveErr] = useState('');
  const [stockPick, setStockPick] = useState<number | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [saving, setSaving] = useState(false);
  const touched = useRef(false);

  // prefill: edit mode or duplicate
  useEffect(() => {
    if (loading) return;
    if (editing) {
      const inv = invoices.find((i) => i.id === id);
      if (!inv) return;
      setInvoiceNo(inv.invoice_no);
      setInvoiceDate(inv.invoice_date);
      setCustomerId(inv.customer_id ?? '');
      setCustomName(inv.customer_id ? '' : inv.customer_name ?? '');
      setCustomPhone(inv.customer_phone ?? '');
      setReceived(String(num(inv.received)));
      setPaymentMode(inv.payment_mode ?? 'cash');
      setNotes(inv.notes ?? '');
      const its = items.filter((it) => it.invoice_id === inv.id);
      if (its.length > 0) {
        setRows(
          its.map((it) => ({
            _id: itemSeq++,
            quantity: String(num(it.quantity)),
            description: it.description ?? '',
            size_label: it.size_label ?? '',
            square_feet: String(num(it.square_feet)),
            rate: String(num(it.rate))
          }))
        );
      }
    } else {
      const src = clone;
      if (src) {
        setInvoiceNo('');
        setInvoiceDate(src.invoice_date);
        setCustomerId(src.customer_id ?? '');
        setCustomName(src.customer_id ? '' : src.customer_name ?? '');
        setCustomPhone(src.customer_phone ?? '');
        setReceived(String(num(src.received)));
        setPaymentMode(src.payment_mode ?? 'cash');
        setNotes(src.notes ?? '');
        const its = items.filter((it) => it.invoice_id === src.id);
        if (its.length > 0) {
          setRows(
            its.map((it) => ({
              _id: itemSeq++,
              quantity: String(num(it.quantity)),
              description: it.description ?? '',
              size_label: it.size_label ?? '',
              square_feet: String(num(it.square_feet)),
              rate: String(num(it.rate))
            }))
          );
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, editing, id, clone?.id]);

  // auto invoice number for new bills
  useEffect(() => {
    if (!editing && !invoiceNo && invoices.length >= 0) {
      setInvoiceNo(nextInvoiceNo(invoicePrefix, invoices.map((i) => i.invoice_no)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, invoices.length, invoicePrefix]);

  const markTouched = () => {
    touched.current = true;
  };

  const setRow = (rid: number, patch: Partial<Row>) => {
    markTouched();
    setRows((rs) => rs.map((r) => (r._id === rid ? { ...r, ...patch } : r)));
  };

  const customer = customers.find((c) => c.id === customerId);

  // ── live math ──
  const rowAmount = (r: Row): number =>
    rateMode === 'sqft' ? num(r.square_feet) * num(r.rate) : num(r.quantity) * num(r.rate);

  const subTotal = useMemo(() => rows.reduce((s, r) => s + rowAmount(r), 0), [rows, rateMode]);
  const total = subTotal;
  const receivedNum = num(received);
  const remaining = total - receivedNum;

  const billData: BillData = useMemo(
    () => ({
      invoice_no: invoiceNo || '—',
      invoice_date: invoiceDate,
      customer_name: customer?.name ?? customName,
      customer_phone: customer?.phone ?? customPhone,
      sub_total: subTotal,
      total,
      received: receivedNum,
      remaining,
      payment_mode: paymentMode,
      notes
    }),
    [invoiceNo, invoiceDate, customer, customName, customPhone, subTotal, total, receivedNum, remaining, paymentMode, notes]
  );

  const billItems = rows.map((r) => ({
    quantity: num(r.quantity),
    description: r.description,
    size_label: r.size_label,
    square_feet: num(r.square_feet),
    rate: num(r.rate),
    amount: rowAmount(r)
  }));

  // ── save ──
  const save = async (then?: 'print' | 'pdf' | null) => {
    const buyer = customer?.name ?? customName.trim();
    if (!buyer) {
      setSaveErr(t('invoice.customerRequired'));
      return;
    }
    if (rows.length === 0) {
      setSaveErr(t('invoice.noItems'));
      return;
    }
    setSaving(true);
    try {
      const values = {
        invoice_no: invoiceNo || nextInvoiceNo(invoicePrefix, invoices.map((i) => i.invoice_no)),
        invoice_date: invoiceDate,
        customer_id: customerId || null,
        customer_name: buyer,
        customer_phone: customer?.phone ?? (customPhone.trim() || null),
        sub_total: subTotal,
        total,
        received: receivedNum,
        remaining,
        payment_mode: paymentMode,
        notes: notes.trim() || null
      };
      let invoiceId: string;
      if (editing && id) {
        await update(id, values);
        invoiceId = id;
      } else {
        const { data, error } = await supabase.from('invoices').insert(values).select().single();
        if (error) throw error;
        invoiceId = data.id;
      }
      await replaceItems(invoiceId, billItems);

      // keep the customer ledger in sync (فروخت + جمع)
      await supabase.from('ledger_entries').delete().eq('invoice_id', invoiceId);
      if (customerId) {
        await supabase.from('ledger_entries').insert([
          { party_id: customerId, party_name: buyer, entry_date: invoiceDate, kind: 'farokht', amount: total, description: `بل ${values.invoice_no}`, invoice_id: invoiceId },
          ...(receivedNum > 0
            ? [{ party_id: customerId, party_name: buyer, entry_date: invoiceDate, kind: 'jama', amount: receivedNum, description: `وصول ${values.invoice_no}`, invoice_id: invoiceId }]
            : [])
        ]);
      }

      touched.current = false;
      toast.success(t('invoice.saved'));
      if (then === 'print') {
        await printBill({ ...billData, invoice_no: values.invoice_no }, billItems, lang);
      } else if (then === 'pdf') {
        await pdfBill({ ...billData, invoice_no: values.invoice_no }, billItems, lang);
      }
      navigate('/invoices');
    } catch {
      toast.error(navigator.onLine ? t('toast.error') : t('toast.offline'));
    } finally {
      setSaving(false);
    }
  };

  const dontSave = () => {
    if (touched.current) setConfirmLeave(true);
    else navigate('/invoices');
  };

  const exportColumns = [
    { key: 'quantity', label: t('common.quantity'), align: 'right' as const },
    { key: 'description', label: t('common.description') },
    { key: 'size_label', label: t('stock.size') },
    { key: 'square_feet', label: t('stock.sqft'), align: 'right' as const },
    { key: 'rate', label: t('common.rate'), align: 'right' as const },
    { key: 'amount', label: t('common.amount'), align: 'right' as const }
  ];
  const exportSpec = () => ({
    title: `${t('invoice.bill')} ${billData.invoice_no} — ${billData.customer_name ?? ''}`,
    columns: exportColumns,
    rows: billItems.map((it) => [fmtNum(it.quantity), it.description ?? '', it.size_label ?? '', fmtNum(it.square_feet), fmtNum(it.rate), fmtNum(it.amount)]),
    summary: [
      { label: t('common.total'), value: fmtNum(total) },
      { label: t('common.received'), value: fmtNum(receivedNum) },
      { label: t('common.remaining'), value: fmtNum(remaining) }
    ],
    lang
  });

  if (loading) {
    return (
      <div className="glass rounded-3xl p-10 text-center">
        <div className="h-8 w-8 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin mx-auto" />
        <p className={`mt-3 text-slate-500 font-bold ${isUr ? 'font-urdu u-text' : ''}`}>{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FactoryHeader />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={`text-2xl sm:text-3xl font-extrabold text-white drop-shadow ${isUr ? 'font-urdu u-head' : ''}`}>
          {editing ? t('invoice.editTitle') : t('invoice.newTitle')}
        </h1>
        {/* rate mode toggle: فٹواری × ریٹ (default) / تعداد × ریٹ */}
        <div className="flex rounded-2xl bg-white/20 border border-white/40 p-1 gap-1">
          <button
            type="button"
            onClick={() => setRateMode('sqft')}
            className={`rounded-xl px-4 h-10 text-sm font-extrabold transition ${rateMode === 'sqft' ? 'bg-white text-violet-700 shadow' : 'text-white'}`}
          >
            <span className={isUr ? 'font-urdu' : ''}>{t('invoice.rateBySqft')}</span>
          </button>
          <button
            type="button"
            onClick={() => setRateMode('qty')}
            className={`rounded-xl px-4 h-10 text-sm font-extrabold transition ${rateMode === 'qty' ? 'bg-white text-violet-700 shadow' : 'text-white'}`}
          >
            <span className={isUr ? 'font-urdu' : ''}>{t('invoice.rateByQty')}</span>
          </button>
        </div>
      </div>

      {/* بنام | نمبر | تاریخ */}
      <div className="glass rounded-3xl shadow-glass p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Select
          label={t('invoice.buyer')}
          value={customerId}
          onChange={(v) => {
            markTouched();
            setCustomerId(v);
          }}
          allowCustom
          placeholder={t('invoice.buyer')}
          options={customers.map((c) => ({ value: c.id, label: c.name }))}
        />
        {!customerId && (
          <div className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-2">
            <Input
              label={t('invoice.walkInCustomer')}
              value={customName}
              onChange={(v) => {
                markTouched();
                setCustomName(v);
              }}
            />
            <Input
              label={t('common.phone')}
              value={customPhone}
              onChange={(v) => {
                markTouched();
                setCustomPhone(toLatinDigits(v));
              }}
              type="tel"
              dir="ltr"
            />
          </div>
        )}
        <Input
          label={t('invoice.no')}
          value={invoiceNo}
          onChange={(v) => {
            markTouched();
            setInvoiceNo(v);
          }}
          dir="ltr"
          className="tabular-nums"
        />
        <Input
          label={t('invoice.dateLabel')}
          type="date"
          dir="ltr"
          value={invoiceDate}
          onChange={(v) => {
            markTouched();
            setInvoiceDate(v);
          }}
        />
      </div>

      {/* items table */}
      <div className="glass rounded-3xl shadow-glass overflow-hidden">
        <div className="overflow-x-auto scroll-slim">
          <table className={`w-full min-w-[760px] text-sm ${isUr ? 'urdu-table' : ''}`}>
            <thead>
              <tr className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
                <th className="px-3 py-3.5 text-start w-20">{t('common.quantity')}</th>
                <th className="px-3 py-3.5 text-start">{t('common.description')}</th>
                <th className="px-3 py-3.5 text-start w-36">{t('stock.size')}</th>
                <th className="px-3 py-3.5 text-start w-24">{t('stock.sqft')}</th>
                <th className="px-3 py-3.5 text-start w-24">{t('common.rate')}</th>
                <th className="px-3 py-3.5 text-end w-28">{t('common.amount')}</th>
                <th className="px-3 py-3.5 text-center w-16" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} className="border-b border-slate-100 even:bg-indigo-50/40">
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      value={r.quantity}
                      onChange={(e) => setRow(r._id, { quantity: toLatinDigits(e.target.value) })}
                      className="input !h-11 !py-0 tabular-nums text-center"
                    />
                  </td>
                  <td className="px-2 py-2 min-w-[180px]">
                    <input
                      type="text"
                      value={r.description}
                      onChange={(e) => setRow(r._id, { description: e.target.value })}
                      className={`input !h-11 !py-0 ${isUr ? 'font-urdu urdu-input' : ''}`}
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {marbleTypes.slice(0, 8).map((mt) => (
                        <button
                          key={mt.id}
                          type="button"
                          onClick={() => setRow(r._id, { description: isUr ? mt.name_ur : mt.name_en })}
                          className="chip !text-[10px] gap-1.5"
                        >
                          <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ background: mt.color_hex ?? '#94a3b8' }} />
                          <span className={isUr ? 'font-urdu' : ''}>{isUr ? mt.name_ur : mt.name_en}</span>
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={marbleSizes.some((s) => s.label === r.size_label) ? r.size_label : r.size_label ? '__custom__' : ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === '__custom__') setRow(r._id, { size_label: ' ' });
                        else setRow(r._id, { size_label: v });
                      }}
                      className={`input !h-11 !py-0 cursor-pointer ${isUr ? 'font-urdu' : ''}`}
                    >
                      <option value="">—</option>
                      {marbleSizes.map((s) => (
                        <option key={s.id} value={s.label}>
                          {s.label}
                        </option>
                      ))}
                      <option value="__custom__">{t('common.otherTypeYourOwn')}</option>
                    </select>
                    {!marbleSizes.some((s) => s.label === r.size_label) && r.size_label !== '' && (
                      <input
                        type="text"
                        value={r.size_label === ' ' ? '' : r.size_label}
                        onChange={(e) => setRow(r._id, { size_label: e.target.value })}
                        className={`input !h-11 !py-0 mt-2 font-semibold ${isUr ? 'font-urdu urdu-input' : ''}`}
                        placeholder={isUr ? 'خود لکھیں...' : 'Type here...'}
                        autoFocus
                      />
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      value={r.square_feet}
                      onChange={(e) => setRow(r._id, { square_feet: toLatinDigits(e.target.value) })}
                      className="input !h-11 !py-0 tabular-nums text-end"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      value={r.rate}
                      onChange={(e) => setRow(r._id, { rate: toLatinDigits(e.target.value) })}
                      className="input !h-11 !py-0 tabular-nums text-end"
                    />
                  </td>
                  <td className="px-3 py-2 text-end font-extrabold text-slate-800 tabular-nums">{fmtNum(rowAmount(r))}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        title={t('invoice.pickFromStock')}
                        onClick={() => setStockPick(r._id)}
                        className="h-11 w-11 grid place-items-center rounded-xl bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition active:scale-95"
                      >
                        <Boxes className="h-4.5 w-4.5" />
                      </button>
                      <button
                        type="button"
                        title={t('common.delete')}
                        onClick={() => {
                          markTouched();
                          setRows((rs) => (rs.length > 1 ? rs.filter((x) => x._id !== r._id) : rs));
                        }}
                        className="h-11 w-11 grid place-items-center rounded-xl bg-rose-100 text-rose-600 hover:bg-rose-200 transition active:scale-95"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3">
          <button type="button" className="btn btn-outline" onClick={() => { markTouched(); setRows((rs) => [...rs, emptyRow()]); }}>
            <Plus className="h-5 w-5" />
            <span className={isUr ? 'font-urdu' : ''}>{t('invoice.addRow')}</span>
          </button>
        </div>
      </div>

      {/* totals panel */}
      <div className="glass rounded-3xl shadow-glass p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <div className="space-y-4">
            <Input
              label={t('invoice.receivedAmount')}
              value={received}
              onChange={(v) => {
                markTouched();
                setReceived(toLatinDigits(v));
              }}
              inputMode="decimal"
              dir="ltr"
              className="tabular-nums !text-lg font-extrabold"
            />
            <Select
              label={t('invoice.paymentMode')}
              value={paymentMode}
              onChange={(v) => {
                markTouched();
                setPaymentMode(v);
              }}
              options={PAYMENT_MODES.map((o) => ({ value: o.value, label: isUr ? o.ur : o.en }))}
            />
            <Input
              label={t('invoice.notesPh')}
              value={notes}
              onChange={(v) => {
                markTouched();
                setNotes(v);
              }}
            />
          </div>

          {/* bold gradient totals */}
          <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 text-white p-5 shadow-xl space-y-3">
            <div className="flex justify-between items-center text-lg font-bold">
              <span className={isUr ? 'font-urdu u-text' : ''}>{t('invoice.grandTotal')}</span>
              <span className="tabular-nums text-2xl font-extrabold" dir="ltr">{fmtNum(total)}</span>
            </div>
            <div className="flex justify-between items-center font-bold">
              <span className={isUr ? 'font-urdu u-text' : ''}>{t('invoice.receivedAmount')}</span>
              <span className="tabular-nums text-xl font-extrabold" dir="ltr">{fmtNum(receivedNum)}</span>
            </div>
            <div className={`flex justify-between items-center text-lg font-extrabold rounded-2xl px-4 py-3 ${remaining > 0 ? 'bg-rose-500/40' : 'bg-emerald-500/40'}`}>
              <span className={isUr ? 'font-urdu u-text' : ''}>{t('invoice.remainingAmount')}</span>
              <span className="tabular-nums text-2xl" dir="ltr">{fmtNum(remaining)}</span>
            </div>
            <div className="border-t-2 border-dashed border-white/50 pt-3 mt-4 text-sm font-bold" style={{ direction: isUr ? 'rtl' : 'ltr' }}>
              ____________________ &nbsp;&nbsp; {t('invoice.signatureLine')}
            </div>
          </div>
        </div>

        {saveErr && (
          <div className={`mt-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 text-sm font-bold ${isUr ? 'font-urdu u-text' : ''}`}>
            {saveErr}
          </div>
        )}
      </div>

      {/* footer actions */}
      <div className="flex flex-wrap gap-2.5">
        <Button variant="success" icon={Plus} loading={saving} onClick={() => void save()}>
          <span className={isUr ? 'font-urdu' : ''}>{t('common.save')}</span>
        </Button>
        <Button variant="neutral" icon={X} onClick={dontSave}>
          <span className={isUr ? 'font-urdu' : ''}>{t('common.dontSave')}</span>
        </Button>
        <Button variant="info" size="sm" icon={Printer} onClick={() => void printBill(billData, billItems, lang)}>
          {t('invoice.printBill')}
        </Button>
        <Button variant="pdf" size="sm" icon={FileDown} onClick={() => void pdfBill(billData, billItems, lang)}>
          {t('invoice.downloadPdf')}
        </Button>
        <Button variant="whatsapp" size="sm" icon={MessageCircle} onClick={() => void shareText(buildShareText(exportSpec()))}>
          {t('invoice.shareWa')}
        </Button>
        <Button variant="excel" size="sm" icon={FileSpreadsheet} onClick={() => exportExcel(exportSpec(), `bill-${billData.invoice_no}.xlsx`)}>
          {t('exportbar.excel')}
        </Button>
        <Button variant="word" size="sm" icon={FileType2} onClick={() => void exportWord(exportSpec(), `bill-${billData.invoice_no}.docx`)}>
          {t('exportbar.word')}
        </Button>
        <Button variant="csv" size="sm" icon={Table} onClick={() => exportCsv(exportSpec(), `bill-${billData.invoice_no}.csv`)}>
          {t('exportbar.csv')}
        </Button>
        <Button variant="primary" size="sm" icon={FileText} onClick={() => void save('print')}>
          {t('common.save')} + {t('invoice.printBill')}
        </Button>
      </div>

      {/* stock picker modal */}
      <Modal open={stockPick !== null} onClose={() => setStockPick(null)} title={t('invoice.stockPickTitle')}>
        {stock.length === 0 ? (
          <p className={`text-center py-8 text-slate-400 font-bold ${isUr ? 'font-urdu u-text' : ''}`}>{t('invoice.noStock')}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {stock.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (stockPick !== null) {
                    setRow(stockPick, {
                      description: s.marble_type_name ?? '',
                      size_label: s.size_label ?? '',
                      rate: String(num(s.rate_per_sqft))
                    });
                  }
                  setStockPick(null);
                  toast.success(t('common.savedToast'));
                }}
                className="rounded-2xl border-2 border-indigo-100 hover:border-violet-400 bg-white p-4 text-start transition active:scale-[0.98] shadow-sm"
              >
                <div className="flex items-center gap-2 font-extrabold text-slate-800">
                  <span className="h-4 w-4 rounded-full" style={{ background: s.color ?? '#94a3b8' }} />
                  <span className={isUr ? 'font-urdu' : ''}>{s.marble_type_name}</span>
                </div>
                <div className="text-sm text-slate-500 mt-1.5 tabular-nums" dir="ltr">
                  {s.size_label} · {fmtNum(s.quantity)} qty · {fmtNum(s.rate_per_sqft)}/ft
                </div>
              </button>
            ))}
          </div>
        )}
      </Modal>

      {/* leave without saving? */}
      <ConfirmDialog
        open={confirmLeave}
        title={t('common.unsavedTitle')}
        message={t('invoice.discardConfirm')}
        tone="warning"
        confirmLabel={t('common.dontSave')}
        cancelLabel={t('common.save')}
        onConfirm={() => {
          setConfirmLeave(false);
          navigate('/invoices');
        }}
        onClose={() => {
          setConfirmLeave(false);
          void save();
        }}
      />
    </div>
  );
}
