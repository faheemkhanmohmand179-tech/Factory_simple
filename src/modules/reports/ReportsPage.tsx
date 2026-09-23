import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Printer } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ChartCard from '../../components/ui/ChartCard';
import DataTable from '../../components/ui/DataTable';
import ExportImportBar from '../../components/ui/ExportImportBar';
import { useLang } from '../../i18n';
import { useInvoices } from '../../hooks/useInvoices';
import { useExpenses } from '../../hooks/useExpenses';
import { dayjs, fmtNum, num, todayStr } from '../../utils/format';
import { buildTableHtml, printHtml } from '../../export/exportPdf';

type Mode = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface Bucket {
  key: string;
  label: string;
  sales: number;
  received: number;
  remaining: number;
  expenses: number;
}

export default function ReportsPage() {
  const { t, lang, isUr } = useLang();
  const { rows: invoices } = useInvoices();
  const { rows: expenses } = useExpenses();

  const [mode, setMode] = useState<Mode>('monthly');
  const [from, setFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [to, setTo] = useState(todayStr());

  const buckets = useMemo<Bucket[]>(() => {
    const map = new Map<string, Bucket>();

    const bucketKey = (d: string): { key: string; label: string } => {
      const day = dayjs(d);
      if (mode === 'daily') return { key: day.format('YYYY-MM-DD'), label: day.format('DD-MM') };
      if (mode === 'weekly') {
        const w = day.startOf('isoWeek');
        return { key: w.format('YYYY-MM-DD'), label: `${w.format('DD-MM')} →` };
      }
      if (mode === 'monthly') return { key: day.format('YYYY-MM'), label: day.format('MM-YYYY') };
      return { key: day.format('YYYY'), label: day.format('YYYY') };
    };

    const touch = (d: string): Bucket => {
      const { key, label } = bucketKey(d);
      let b = map.get(key);
      if (!b) {
        b = { key, label, sales: 0, received: 0, remaining: 0, expenses: 0 };
        map.set(key, b);
      }
      return b;
    };

    for (const inv of invoices) {
      if (inv.invoice_date < from || inv.invoice_date > to) continue;
      const b = touch(inv.invoice_date);
      b.sales += num(inv.total);
      b.received += num(inv.received);
      b.remaining += num(inv.remaining);
    }
    for (const e of expenses) {
      if (e.expense_date < from || e.expense_date > to) continue;
      touch(e.expense_date).expenses += num(e.amount);
    }

    return [...map.values()].sort((a, b) => (a.key < b.key ? -1 : 1));
  }, [invoices, expenses, from, to, mode]);

  const totals = useMemo(
    () => ({
      sales: buckets.reduce((s, b) => s + b.sales, 0),
      received: buckets.reduce((s, b) => s + b.received, 0),
      remaining: buckets.reduce((s, b) => s + b.remaining, 0),
      expenses: buckets.reduce((s, b) => s + b.expenses, 0)
    }),
    [buckets]
  );

  const modes: { key: Mode; label: string }[] = [
    { key: 'daily', label: t('reports.daily') },
    { key: 'weekly', label: t('reports.weekly') },
    { key: 'monthly', label: t('reports.monthly') },
    { key: 'yearly', label: t('reports.yearly') }
  ];

  const axisStyle = { fontSize: 11, fill: '#64748b' };
  const tooltipStyle = { borderRadius: 14, border: '1px solid #e0e7ff', fontSize: 12, direction: 'ltr' as const };

  const exportCols = [
    { key: 'label', label: t('reports.bucket') },
    { key: 'sales', label: t('reports.salesCol'), align: 'right' as const },
    { key: 'received', label: t('reports.receivedCol'), align: 'right' as const },
    { key: 'remaining', label: t('reports.remainingCol'), align: 'right' as const },
    { key: 'expenses', label: t('reports.expensesCol'), align: 'right' as const }
  ];
  const exportRows = buckets.map((b) => ({
    label: b.label,
    sales: fmtNum(b.sales),
    received: fmtNum(b.received),
    remaining: fmtNum(b.remaining),
    expenses: fmtNum(b.expenses)
  }));
  const summary = [
    { label: t('reports.salesCol'), value: fmtNum(totals.sales) },
    { label: t('reports.receivedCol'), value: fmtNum(totals.received) },
    { label: t('reports.remainingCol'), value: fmtNum(totals.remaining) },
    { label: t('reports.expensesCol'), value: fmtNum(totals.expenses) }
  ];

  const doPrint = () => {
    void printHtml(
      buildTableHtml({
        title: `${t('reports.title')} (${mode}) — ${from} → ${to}`,
        columns: exportCols.map(({ key: _k, ...c }) => c),
        rows: exportRows.map((r) => [r.label, r.sales, r.received, r.remaining, r.expenses]),
        summary,
        lang
      }),
      'a4'
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <h1 className={`text-2xl sm:text-3xl font-extrabold text-white drop-shadow ${isUr ? 'font-urdu u-head' : ''}`}>{t('reports.title')}</h1>
        <div className="flex flex-wrap items-end gap-2.5">
          {modes.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              className={`chip ${mode === m.key ? 'chip-active' : ''}`}
            >
              <span className={isUr ? 'font-urdu' : ''}>{m.label}</span>
            </button>
          ))}
          <div className="w-40">
            <Input label={t('common.from')} type="date" dir="ltr" value={from} onChange={setFrom} />
          </div>
          <div className="w-40">
            <Input label={t('common.to')} type="date" dir="ltr" value={to} onChange={setTo} />
          </div>
          <Button variant="info" size="sm" icon={Printer} onClick={doPrint}>
            {t('reports.printReport')}
          </Button>
        </div>
      </div>

      {buckets.length === 0 ? (
        <div className="glass rounded-3xl p-10 text-center">
          <p className={`text-slate-500 font-bold ${isUr ? 'font-urdu u-text' : ''}`}>{t('reports.noData')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title={t('reports.sales')} height={250}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={buckets} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={axisStyle} />
                  <YAxis tick={axisStyle} width={54} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtNum(v)} />
                  <Bar dataKey="sales" name={t('reports.sales')} fill="#7c3aed" radius={[7, 7, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title={t('reports.expensesR')} height={250}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={buckets} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={axisStyle} />
                  <YAxis tick={axisStyle} width={54} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtNum(v)} />
                  <Bar dataKey="expenses" name={t('reports.expensesR')} fill="#f59e0b" radius={[7, 7, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title={t('reports.receivedVsRem')} height={250}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={buckets} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={axisStyle} />
                  <YAxis tick={axisStyle} width={54} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtNum(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="received" name={t('common.received')} fill="#059669" radius={[7, 7, 0, 0]} />
                  <Bar dataKey="remaining" name={t('common.remaining')} fill="#e11d48" radius={[7, 7, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <DataTable
            rows={buckets}
            rowKey={(b) => b.key}
            columns={[
              { key: 'label', label: t('reports.bucket') },
              { key: 'sales', label: t('reports.salesCol'), align: 'right', render: (b) => <b>{fmtNum(b.sales)}</b> },
              { key: 'received', label: t('reports.receivedCol'), align: 'right', render: (b) => <span className="text-emerald-700 font-bold">{fmtNum(b.received)}</span> },
              { key: 'remaining', label: t('reports.remainingCol'), align: 'right', render: (b) => <span className="text-rose-600 font-bold">{fmtNum(b.remaining)}</span> },
              { key: 'expenses', label: t('reports.expensesCol'), align: 'right', render: (b) => fmtNum(b.expenses) }
            ]}
            footer={
              <tr>
                <td className="px-4 py-3.5">{t('common.total')}</td>
                <td className="px-4 py-3.5 text-end tabular-nums">{fmtNum(totals.sales)}</td>
                <td className="px-4 py-3.5 text-end tabular-nums">{fmtNum(totals.received)}</td>
                <td className="px-4 py-3.5 text-end tabular-nums">{fmtNum(totals.remaining)}</td>
                <td className="px-4 py-3.5 text-end tabular-nums">{fmtNum(totals.expenses)}</td>
              </tr>
            }
          />

          <ExportImportBar
            title={`${t('reports.title')} (${mode})`}
            filenameBase={`report-${mode}`}
            columns={exportCols}
            rows={exportRows as unknown as Record<string, unknown>[]}
            summary={summary}
          />
        </div>
      )}
    </div>
  );
}
