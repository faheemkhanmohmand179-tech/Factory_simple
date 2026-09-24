import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, HandCoins, Minus, Plus, Scale } from 'lucide-react';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ExportImportBar from '../../components/ui/ExportImportBar';
import { useToast } from '../../components/ui/Toast';
import { useLang } from '../../i18n';
import { useCustomers } from '../../hooks/useCustomers';
import { useLedger } from '../../hooks/useLedger';
import { LEDGER_KINDS, optLabel, type Customer, type LedgerEntry } from '../../types';
import { fmtDate, fmtNum, num, todayStr, toLatinDigits } from '../../utils/format';
import { parseDateCell, parseNumCell, type ImportConfig } from '../../import/importExcel';

export default function CustomerLedgerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, lang, isUr } = useLang();
  const toast = useToast();
  const { rows: customers } = useCustomers();
  const { rows: allEntries, loading, insert, update, remove } = useLedger();

  const customer = customers.find((c) => c.id === id) as Customer | undefined;
  const entries = useMemo(
    () =>
      allEntries
        .filter((e) => e.party_id === id)
        .sort((a, b) => (a.entry_date === b.entry_date ? (a.created_at < b.created_at ? -1 : 1) : a.entry_date < b.entry_date ? -1 : 1)),
    [allEntries, id]
  );

  // running balance rows (تاریخ | تفصیل | ادھار | جمع | بیلنس)
  const rowsWithBalance = useMemo(() => {
    let bal = num(customer?.opening_balance);
    return entries.map((e) => {
      const isDebit = e.kind === 'udhaar' || e.kind === 'farokht' || e.kind === 'payment';
      const amt = num(e.amount);
      bal += isDebit ? amt : -amt;
      return { ...e, debit: isDebit ? amt : 0, credit: isDebit ? 0 : amt, running: bal };
    });
  }, [entries, customer]);

  const balance = rowsWithBalance.length > 0 ? rowsWithBalance[rowsWithBalance.length - 1].running : num(customer?.opening_balance);

  const [modal, setModal] = useState<{ open: boolean; edit?: LedgerEntry }>({ open: false });
  const [del, setDel] = useState<LedgerEntry | null>(null);
  const [date, setDate] = useState(todayStr());
  const [kind, setKind] = useState('udhaar');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [amountErr, setAmountErr] = useState('');

  const openAdd = () => {
    setDate(todayStr());
    setKind('udhaar');
    setAmount('');
    setDesc('');
    setAmountErr('');
    setModal({ open: true });
  };

  const openEdit = (e: LedgerEntry) => {
    setDate(e.entry_date);
    setKind(e.kind);
    setAmount(String(num(e.amount)));
    setDesc(e.description ?? '');
    setAmountErr('');
    setModal({ open: true, edit: e });
  };

  const save = async () => {
    if (num(amount) <= 0) {
      setAmountErr(t('validation.amountEmpty'));
      return;
    }
    if (!customer) return;
    const values = {
      party_id: customer.id,
      party_name: customer.name,
      entry_date: date,
      kind,
      amount: num(amount),
      description: desc.trim() || null
    };
    try {
      if (modal.edit) await update(modal.edit.id, values);
      else await insert(values);
      toast.success(t('ledger.saved'));
      setModal({ open: false });
    } catch {
      toast.error(navigator.onLine ? t('toast.error') : t('toast.offline'));
    }
  };

  const doDelete = async () => {
    if (!del) return;
    try {
      await remove(del.id);
      toast.success(t('ledger.deleted'));
    } catch {
      toast.error(t('toast.error'));
    } finally {
      setDel(null);
    }
  };

  // ── import (template: تاریخ | گاہک کا نام | قسم | رقم | تفصیل) ──
  const importCfg: ImportConfig = {
    columns: [
      { key: 'date', labels: ['تاریخ', 'Date'] },
      { key: 'party', labels: ['گاہک کا نام', 'Party Name'] },
      { key: 'kind', labels: ['قسم', 'Kind'] },
      { key: 'amount', labels: ['رقم', 'Amount'] },
      { key: 'desc', labels: ['تفصیل', 'Description'] }
    ],
    example: { date: todayStr(), party: customer?.name ?? '', kind: isUr ? 'ادھار' : 'udhaar', amount: 5000, desc: '' },
    mapRow: (raw) => {
      const d = parseDateCell(raw.date);
      if (!d) return { error: t('validation.dateInvalid') };
      const amt = parseNumCell(raw.amount);
      if (amt == null || amt <= 0) return { error: t('validation.amountEmpty') };
      const k = raw.kind.trim().toLowerCase();
      let kindVal = 'udhaar';
      if (k.includes('جمع') || k.includes('jama')) kindVal = 'jama';
      else if (k.includes('خرید') || k.includes('purchase') || k.includes('kharid')) kindVal = 'kharid';
      else if (k.includes('فروخت') || k.includes('sale') || k.includes('farokht')) kindVal = 'farokht';
      else if (k.includes('ادائیگی') || k.includes('payment')) kindVal = 'payment';
      else if (k.includes('ادھار') || k.includes('udhaar') || k.includes('credit')) kindVal = 'udhaar';
      return {
        row: { party_id: customer?.id ?? null, party_name: customer?.name ?? raw.party, entry_date: d, kind: kindVal, amount: amt, description: raw.desc || null }
      };
    },
    findDuplicate: (existing, mapped) =>
      (existing as LedgerEntry[]).find((e) => e.entry_date === mapped.entry_date && e.kind === mapped.kind && num(e.amount) === num(mapped.amount) && e.party_id === mapped.party_id),
    insertRows: async (rows) => {
      await insert(rows);
    },
    updateRow: async (existing, mapped) => {
      await update((existing as LedgerEntry).id, mapped);
    }
  };

  if (!customer) {
    return (
      <div className="glass rounded-3xl p-10 text-center">
        <p className={`text-stone-500 font-bold ${isUr ? 'font-urdu u-text' : ''}`}>…</p>
        <Button variant="primary" icon={ArrowLeft} className="mt-4 mx-auto" onClick={() => navigate('/customers')}>
          {t('common.back')}
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* header */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button type="button" onClick={() => navigate('/customers')} className="h-12 w-12 grid place-items-center rounded-2xl bg-white/20 border border-white/30 text-white active:scale-95 transition">
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
        </button>
        <div className="min-w-0">
          <h1 className={`text-2xl sm:text-3xl font-extrabold text-white drop-shadow truncate ${isUr ? 'font-urdu u-head' : ''}`}>
            {t('ledger.title')} — {customer.name}
          </h1>
          {customer.phone && <p className="text-white/70 text-sm tabular-nums" dir="ltr">{customer.phone}</p>}
        </div>
      </div>

      {/* big balance card */}
      <div
        className={`rounded-3xl p-6 mb-4 shadow-glass text-white ${
          balance > 0
            ? 'bg-gradient-to-r from-emerald-500 to-teal-600'
            : balance < 0
              ? 'bg-gradient-to-r from-rose-500 to-red-600'
              : 'bg-gradient-to-r from-stone-500 to-stone-600'
        }`}
      >
        <div className="flex items-center gap-3">
          {balance > 0 ? <HandCoins className="h-8 w-8" /> : balance < 0 ? <Scale className="h-8 w-8" /> : <Scale className="h-8 w-8" />}
          <div>
            <div className={`text-sm font-bold opacity-90 ${isUr ? 'font-urdu u-text' : ''}`}>
              {balance > 0 ? t('ledger.lenaCard') : balance < 0 ? t('ledger.denaCard') : t('ledger.clearCard')}
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold tabular-nums" dir="ltr">
              {fmtNum(Math.abs(balance))} {isUr ? 'روپے' : 'Rs.'}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 flex justify-end">
        <Button variant="success" icon={Plus} onClick={openAdd}>
          {t('ledger.addEntry')}
        </Button>
      </div>

      <DataTable
        loading={loading}
        rows={rowsWithBalance}
        columns={[
          { key: 'entry_date', label: t('common.date'), render: (e) => <span dir="ltr" className="tabular-nums">{fmtDate(e.entry_date)}</span> },
          {
            key: 'desc',
            label: t('common.description'),
            render: (e) => (
              <div className="min-w-0">
                <span className={`chip chip-static !text-[11px] ${isUr ? 'font-urdu' : ''}`}>{optLabel(LEDGER_KINDS, e.kind, lang, e.kind)}</span>
                <span className={`ms-2 ${isUr ? 'font-urdu' : ''}`}>{e.description || '—'}</span>
              </div>
            )
          },
          { key: 'debit', label: isUr ? 'ادھار' : 'Debit (Udhaar)', align: 'right', render: (e) => e.debit ? <span className="text-emerald-700 font-bold">{fmtNum(e.debit)}</span> : <span className="text-stone-300">—</span> },
          { key: 'credit', label: isUr ? 'جمع' : 'Credit (Jama)', align: 'right', render: (e) => e.credit ? <span className="text-rose-700 font-bold">{fmtNum(e.credit)}</span> : <span className="text-stone-300">—</span> },
          {
            key: 'running',
            label: t('customers.balance'),
            align: 'right',
            render: (e) => (
              <span className={`font-extrabold ${e.running > 0 ? 'text-emerald-700' : e.running < 0 ? 'text-rose-700' : 'text-stone-500'}`}>
                {e.running >= 0 ? '+' : '-'}{fmtNum(Math.abs(e.running))}
              </span>
            )
          }
        ]}
        onEdit={openEdit}
        onDelete={(e) => setDel(e)}
        emptyTitle={t('ledger.noEntries')}
        emptyHint={t('common.noRecordsHint')}
        emptyActionLabel={t('ledger.addEntry')}
        onEmptyAction={openAdd}
      />

      <div className="mt-4">
        <ExportImportBar
          title={`${t('ledger.title')} — ${customer.name}`}
          filenameBase={`ledger-${customer.name}`}
          importCfg={importCfg}
          columns={[
            { key: 'entry_date', label: t('common.date'), get: (e) => fmtDate(e.entry_date) },
            { key: 'kind', label: t('common.type'), get: (e) => optLabel(LEDGER_KINDS, e.kind, lang) },
            { key: 'description', label: t('common.description'), get: (e) => e.description ?? '' },
            { key: 'debit', label: isUr ? 'ادھار' : 'Debit', align: 'right', get: (e) => fmtNum(e.debit) },
            { key: 'credit', label: isUr ? 'جمع' : 'Credit', align: 'right', get: (e) => fmtNum(e.credit) },
            { key: 'running', label: t('customers.balance'), align: 'right', get: (e) => fmtNum(e.running) }
          ]}
          rows={rowsWithBalance as unknown as Record<string, unknown>[]}
          summary={[
            { label: t('customers.openingBalance'), value: fmtNum(customer.opening_balance) },
            { label: t('customers.balance'), value: fmtNum(balance) }
          ]}
        />
      </div>

      {/* entry modal */}
      <Modal open={modal.open} onClose={() => setModal({ open: false })} title={modal.edit ? t('ledger.editEntry') : t('ledger.addEntry')} dirty={Boolean(modal.edit)} onSave={save}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label={t('ledger.entryDate')} type="date" dir="ltr" value={date} onChange={setDate} />
          <Select
            label={t('ledger.entryKind')}
            value={kind}
            onChange={setKind}
            options={LEDGER_KINDS.map((o) => ({ value: o.value, label: isUr ? o.ur : o.en }))}
          />
          <Input
            label={t('ledger.entryAmount')}
            value={amount}
            onChange={(v) => {
              setAmount(toLatinDigits(v));
              setAmountErr('');
            }}
            inputMode="decimal"
            dir="ltr"
            className="tabular-nums"
            error={amountErr}
            icon={Minus}
          />
          <Input label={t('ledger.entryDesc')} value={desc} onChange={setDesc} />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(del)}
        title={t('common.confirmDeleteTitle')}
        message={t('ledger.deleteConfirm')}
        confirmLabel={t('common.delete')}
        onConfirm={doDelete}
        onClose={() => setDel(null)}
      />
    </div>
  );
}
