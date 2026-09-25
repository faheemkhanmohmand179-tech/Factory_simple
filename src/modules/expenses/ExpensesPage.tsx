import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ImagePlus, Receipt } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ExportImportBar from '../../components/ui/ExportImportBar';
import ChartCard from '../../components/ui/ChartCard';
import StatCard from '../../components/ui/StatCard';
import PhotoUpload from '../../components/ui/PhotoUpload';
import { useToast } from '../../components/ui/Toast';
import { useLang } from '../../i18n';
import { useExpenses } from '../../hooks/useExpenses';
import { useCustomColumns } from '../../hooks/useCustomColumns';
import { EXPENSE_CATEGORIES, optLabel, type Expense } from '../../types';
import { dayjs, fmtDate, fmtMoney, fmtNum, num, todayStr, toLatinDigits } from '../../utils/format';
import { parseDateCell, parseNumCell, type ImportConfig } from '../../import/importExcel';

export default function ExpensesPage() {
  const { t, lang, isUr } = useLang();
  const toast = useToast();
  const { rows: expenses, loading, insert, update, remove } = useExpenses();
  const { rows: customCols } = useCustomColumns('expenses');

  const [q, setQ] = useState('');
  const [modal, setModal] = useState<{ open: boolean; edit?: Expense }>({ open: false });
  const [del, setDel] = useState<Expense | null>(null);

  const [date, setDate] = useState(todayStr());
  const [category, setCategory] = useState('bijli');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [amountErr, setAmountErr] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [customVals, setCustomVals] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    const needle = toLatinDigits(q.trim().toLowerCase());
    if (!needle) return expenses;
    return expenses.filter(
      (e) =>
        (e.description ?? '').toLowerCase().includes(needle) ||
        optLabel(EXPENSE_CATEGORIES, e.category, lang, e.category).toLowerCase().includes(needle) ||
        (e.custom_category ?? '').toLowerCase().includes(needle)
    );
  }, [expenses, q, lang]);

  const month = dayjs().format('YYYY-MM');
  const monthTotal = useMemo(
    () => expenses.filter((e) => (e.expense_date ?? '').startsWith(month)).reduce((s, e) => s + num(e.amount), 0),
    [expenses, month]
  );

  const byCategory = useMemo(
    () =>
      EXPENSE_CATEGORIES.map((c) => ({
        label: optLabel(EXPENSE_CATEGORIES, c.value, lang),
        value: expenses.filter((e) => e.category === c.value).reduce((s, e) => s + num(e.amount), 0)
      })).filter((x) => x.value > 0),
    [expenses, lang]
  );

  const openAdd = () => {
    setDate(todayStr());
    setCategory('bijli');
    setAmount('');
    setDesc('');
    setAmountErr('');
    setPhotos([]);
    setCustomVals({});
    setModal({ open: true });
  };

  const openEdit = (e: Expense) => {
    setDate(e.expense_date);
    setCategory(e.custom_category ?? e.category);
    setAmount(String(num(e.amount)));
    setDesc(e.description ?? '');
    setAmountErr('');
    setPhotos(e.photo_urls ?? []);
    setCustomVals(e.custom_fields ?? {});
    setModal({ open: true, edit: e });
  };

  const save = async () => {
    if (num(amount) <= 0) {
      setAmountErr(t('validation.amountEmpty'));
      return;
    }
    const inList = EXPENSE_CATEGORIES.some((c) => c.value === category);
    const values = {
      expense_date: date,
      category: inList ? category : 'other',
      custom_category: inList ? null : category,
      amount: num(amount),
      description: desc.trim() || null,
      photo_urls: photos.length ? photos : null,
      custom_fields: Object.keys(customVals).length ? customVals : null
    };
    try {
      if (modal.edit) await update(modal.edit.id, values);
      else await insert(values);
      toast.success(t('expenses.saved'));
      setModal({ open: false });
    } catch {
      toast.error(navigator.onLine ? t('toast.error') : t('toast.offline'));
    }
  };

  const doDelete = async () => {
    if (!del) return;
    try {
      await remove(del.id);
      toast.success(t('expenses.deleted'));
    } catch {
      toast.error(t('toast.error'));
    } finally {
      setDel(null);
    }
  };

  const importCfg: ImportConfig = {
    columns: [
      { key: 'date', labels: ['تاریخ', 'Date'] },
      { key: 'category', labels: ['کیٹیگری', 'Category'] },
      { key: 'desc', labels: ['تفصیل', 'Description'] },
      { key: 'amount', labels: ['رقم', 'Amount'] }
    ],
    example: { date: todayStr(), category: isUr ? 'بجلی' : 'bijli', desc: isUr ? 'مہینے کا بل' : 'Monthly bill', amount: 15000 },
    mapRow: (raw) => {
      const d = parseDateCell(raw.date);
      if (!d) return { error: t('validation.dateInvalid') };
      const amt = parseNumCell(raw.amount);
      if (amt == null || amt <= 0) return { error: t('validation.amountEmpty') };
      const k = raw.category.trim().toLowerCase();
      const match = EXPENSE_CATEGORIES.find((c) => k === c.value || k.includes(c.ur) || k.includes(c.en.toLowerCase()));
      return {
        row: { expense_date: d, category: match ? match.value : 'other', custom_category: match ? null : raw.category || null, amount: amt, description: raw.desc || null }
      };
    },
    findDuplicate: (existing, mapped) =>
      (existing as Expense[]).find((e) => e.expense_date === mapped.expense_date && num(e.amount) === num(mapped.amount) && e.category === mapped.category),
    insertRows: async (rows) => {
      await insert(rows);
    },
    updateRow: async (existing, mapped) => {
      await update((existing as Expense).id, mapped);
    }
  };

  const axisStyle = { fontSize: 11, fill: '#64748b' };
  const tooltipStyle = { borderRadius: 14, border: '1px solid #e0e7ff', fontSize: 12, direction: 'ltr' as const };

  return (
    <div>
      <PageHeader title={t('expenses.title')} count={filtered.length} addLabel={t('expenses.add')} onAdd={openAdd} search={{ value: q, onChange: setQ }} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <StatCard icon={Receipt} label={t('expenses.monthTotal')} value={fmtMoney(monthTotal, lang)} tone="amber" />
        <div className="lg:col-span-2">
          <ChartCard title={t('expenses.byCategory')} height={170}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCategory} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={axisStyle} />
                <YAxis tick={axisStyle} width={52} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtNum(v)} />
                <Bar dataKey="value" name={t('reports.expensesR')} fill="#f59e0b" radius={[7, 7, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      <DataTable
        loading={loading}
        rows={filtered}
        columns={[
          {
            key: 'photo',
            label: t('photos.title'),
            render: (e) =>
              e.photo_urls && e.photo_urls.length > 0 ? (
                <img src={e.photo_urls[0]} alt="" className="h-11 w-11 rounded-xl object-cover border-2 border-teal-200" />
              ) : (
                <span className="h-11 w-11 grid place-items-center rounded-xl bg-stone-100 text-stone-300">
                  <ImagePlus className="h-5 w-5" />
                </span>
              )
          },
          { key: 'expense_date', label: t('common.date'), render: (e) => <span dir="ltr" className="tabular-nums">{fmtDate(e.expense_date)}</span> },
          {
            key: 'category',
            label: t('common.category'),
            render: (e) => <span className={`chip chip-static ${isUr ? 'font-urdu' : ''}`}>{e.custom_category ?? optLabel(EXPENSE_CATEGORIES, e.category, lang, e.category)}</span>
          },
          { key: 'description', label: t('expenses.desc'), render: (e) => <span className={isUr ? 'font-urdu' : ''}>{e.description || '—'}</span> },
          { key: 'amount', label: t('expenses.amount'), align: 'right', render: (e) => <span className="font-extrabold text-rose-700">{fmtNum(e.amount)}</span> },
          ...customCols.map((c) => ({
            key: `custom_${c.key}`,
            label: isUr ? c.label_ur : c.label_en,
            render: (e: Expense) => <span className={isUr ? 'font-urdu' : ''}>{e.custom_fields?.[c.key] || '—'}</span>
          }))
        ]}
        onEdit={openEdit}
        onDelete={(e) => setDel(e)}
        emptyTitle={t('expenses.noExpenses')}
        emptyHint={t('common.noRecordsHint')}
        emptyActionLabel={t('expenses.add')}
        onEmptyAction={openAdd}
        footer={
          <tr>
            <td className="px-4 py-3.5">{t('common.total')}</td>
            <td />
            <td />
            <td />
            <td className="px-4 py-3.5 text-end tabular-nums text-rose-700">{fmtNum(filtered.reduce((s, e) => s + num(e.amount), 0))}</td>
            {customCols.length > 0 && customCols.map((c) => <td key={c.id} />)}
            <td />
          </tr>
        }
      />

      <div className="mt-4">
        <ExportImportBar
          title={t('expenses.title')}
          filenameBase="expenses"
          importCfg={importCfg}
          columns={[
            { key: 'expense_date', label: t('common.date'), get: (e) => fmtDate(e.expense_date) },
            { key: 'category', label: t('common.category'), get: (e) => e.custom_category ?? optLabel(EXPENSE_CATEGORIES, e.category, lang) },
            { key: 'description', label: t('expenses.desc'), get: (e) => e.description ?? '' },
            { key: 'amount', label: t('expenses.amount'), align: 'right', get: (e) => fmtNum(e.amount) }
          ]}
          rows={filtered as unknown as Record<string, unknown>[]}
          summary={[{ label: t('common.total'), value: fmtNum(filtered.reduce((s, e) => s + num(e.amount), 0)) }]}
        />
      </div>

      <Modal open={modal.open} onClose={() => setModal({ open: false })} title={modal.edit ? t('expenses.edit') : t('expenses.add')} dirty={Boolean(modal.edit)} onSave={save}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label={t('common.date')} type="date" dir="ltr" value={date} onChange={setDate} />
          <Select label={t('common.category')} value={category} onChange={setCategory} allowCustom options={EXPENSE_CATEGORIES.map((o) => ({ value: o.value, label: isUr ? o.ur : o.en }))} />
          <Input
            label={t('expenses.amount')}
            value={amount}
            onChange={(v) => {
              setAmount(toLatinDigits(v));
              setAmountErr('');
            }}
            inputMode="decimal"
            dir="ltr"
            className="tabular-nums !text-lg font-extrabold"
            error={amountErr}
            icon={Receipt}
          />
          <Input label={t('expenses.desc')} value={desc} onChange={setDesc} />
          {/* manually-added columns (from Settings) */}
          {customCols.map((c) => (
            <Input
              key={c.id}
              label={isUr ? c.label_ur : c.label_en}
              value={customVals[c.key] ?? ''}
              onChange={(v) => setCustomVals((prev) => ({ ...prev, [c.key]: v }))}
            />
          ))}
        </div>

        {/* photos — below the main fields so you scroll down to see them */}
        <div className="mt-6 pt-6 border-t border-stone-100">
          <PhotoUpload urls={photos} onChange={setPhotos} folder="expenses" />
        </div>
      </Modal>

      <ConfirmDialog open={Boolean(del)} title={t('common.confirmDeleteTitle')} message={t('expenses.deleteConfirm')} confirmLabel={t('common.delete')} onConfirm={doDelete} onClose={() => setDel(null)} />
    </div>
  );
}
