import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  Banknote,
  Boxes,
  CalendarCheck,
  FileText,
  HandCoins,
  Plus,
  Receipt,
  UserPlus,
  Wallet,
  Wrench
} from 'lucide-react';
import FactoryHeader from '../../components/FactoryHeader';
import StatCard from '../../components/ui/StatCard';
import ChartCard from '../../components/ui/ChartCard';
import ExportImportBar from '../../components/ui/ExportImportBar';
import { useLang } from '../../i18n';
import { useInvoices } from '../../hooks/useInvoices';
import { useExpenses } from '../../hooks/useExpenses';
import { useLabour } from '../../hooks/useLabour';
import { useAttendance } from '../../hooks/useAttendance';
import { useMachinery } from '../../hooks/useMachinery';
import { useStock } from '../../hooks/useStock';
import { useCustomers } from '../../hooks/useCustomers';
import { useLedger, computeBalances } from '../../hooks/useLedger';
import { EXPENSE_CATEGORIES, optLabel } from '../../types';
import { dayjs, fmtMoney, fmtNum, monthLabel, num, todayStr } from '../../utils/format';

/** Chart period selector — دن / ہفتہ / مہینہ / ۳ ماہ / ۶ ماہ / ۱ سال (جنوری تا دسمبر) */
type Period = 'day' | 'week' | 'month' | 'm3' | 'm6' | 'y';

const PERIODS: { key: Period; labelKey: string }[] = [
  { key: 'day', labelKey: 'dashboard.pDay' },
  { key: 'week', labelKey: 'dashboard.pWeek' },
  { key: 'month', labelKey: 'dashboard.pMonth' },
  { key: 'm3', labelKey: 'dashboard.p3m' },
  { key: 'm6', labelKey: 'dashboard.p6m' },
  { key: 'y', labelKey: 'dashboard.pYear' }
];

type Dayjs = ReturnType<typeof dayjs>;

interface ChartPoint {
  label: string;
  sales: number;
  received: number;
  remaining: number;
}

export default function DashboardPage() {
  const { t, lang, isUr } = useLang();
  const navigate = useNavigate();
  const { rows: invoices, loading } = useInvoices();
  const { rows: expenses } = useExpenses();
  const { rows: labour } = useLabour();
  const { rows: attendance } = useAttendance();
  const { rows: machinery } = useMachinery();
  const { rows: stock } = useStock();
  const { rows: customers } = useCustomers();
  const { rows: ledger } = useLedger();

  const today = todayStr();
  const month = dayjs().format('YYYY-MM');
  // chart period — default: 1 year January → December
  const [period, setPeriod] = useState<Period>('y');

  const stats = useMemo(() => {
    const todaySales = invoices.filter((i) => i.invoice_date === today).reduce((s, i) => s + num(i.total), 0);
    const monthSales = invoices.filter((i) => (i.invoice_date ?? '').startsWith(month)).reduce((s, i) => s + num(i.total), 0);
    const received = invoices.reduce((s, i) => s + num(i.received), 0);
    const remaining = invoices.reduce((s, i) => s + num(i.remaining), 0);
    const expensesTotal = expenses.reduce((s, e) => s + num(e.amount), 0);
    const presentToday = attendance.filter((a) => a.attendance_date === today && a.status === 'present').length;
    const activeLabour = labour.filter((l) => l.active).length;
    const machinesWorking = machinery.filter((m) => m.status === 'working').length;
    return { todaySales, monthSales, received, remaining, expensesTotal, presentToday, activeLabour, machinesWorking, stockCount: stock.length };
  }, [invoices, expenses, labour, attendance, machinery, stock, today, month]);

  /** sales series for the selected period —
   *  دن: last 7 days · ہفتہ: last 8 weeks · مہینہ: current month day-by-day
   *  ۳ ماہ: weekly bars · ۶ ماہ: monthly bars · ۱ سال: جنوری تا دسمبر */
  const series = useMemo<ChartPoint[]>(() => {
    const mk = (label: string, from: Dayjs, to: Dayjs): ChartPoint => {
      const f = from.format('YYYY-MM-DD');
      const t = to.format('YYYY-MM-DD');
      const inv = invoices.filter((i) => {
        const d = i.invoice_date ?? '';
        return d >= f && d <= t;
      });
      return {
        label,
        sales: inv.reduce((s, i) => s + num(i.total), 0),
        received: inv.reduce((s, i) => s + num(i.received), 0),
        remaining: inv.reduce((s, i) => s + num(i.remaining), 0)
      };
    };

    const pts: ChartPoint[] = [];
    if (period === 'day') {
      for (let k = 6; k >= 0; k--) {
        const d = dayjs().subtract(k, 'day');
        pts.push(mk(d.format('DD-MM'), d.startOf('day'), d.endOf('day')));
      }
    } else if (period === 'week') {
      for (let k = 7; k >= 0; k--) {
        const w = dayjs().subtract(k, 'week').startOf('isoWeek');
        pts.push(mk(w.format('DD-MM'), w, w.add(6, 'day').endOf('day')));
      }
    } else if (period === 'month') {
      const start = dayjs().startOf('month');
      const daysInMonth = dayjs().date();
      for (let k = 0; k < daysInMonth; k++) {
        const d = start.add(k, 'day');
        pts.push(mk(String(k + 1), d.startOf('day'), d.endOf('day')));
      }
    } else if (period === 'm3') {
      let cursor = dayjs().subtract(2, 'month').startOf('month').startOf('isoWeek');
      const last = dayjs().endOf('day');
      while (cursor.isBefore(last)) {
        pts.push(mk(cursor.format('DD-MM'), cursor, cursor.add(6, 'day').endOf('day')));
        cursor = cursor.add(1, 'week');
      }
    } else if (period === 'm6') {
      for (let k = 5; k >= 0; k--) {
        const d = dayjs().subtract(k, 'month');
        pts.push(mk(monthLabel(d.month(), lang), d.startOf('month'), d.endOf('month')));
      }
    } else {
      // 1 year — ALWAYS جنوری (January) تا دسمبر (December) of the current year
      for (let m = 0; m < 12; m++) {
        const d = dayjs().month(m).startOf('month');
        pts.push(mk(monthLabel(m, lang), d, d.endOf('month')));
      }
    }
    return pts;
  }, [invoices, period, lang]);

  // expenses by category (independent of the period selector)
  const byCat = useMemo(
    () =>
      EXPENSE_CATEGORIES.map((c) => ({
        label: optLabel(EXPENSE_CATEGORIES, c.value, lang),
        value: expenses.filter((e) => e.category === c.value).reduce((s, e) => s + num(e.amount), 0)
      })).filter((x) => x.value > 0),
    [expenses, lang]
  );

  const latest = useMemo(
    () => [...invoices].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 5),
    [invoices]
  );

  const topCustomers = useMemo(() => {
    const balances = computeBalances(customers, ledger);
    return customers
      .map((c) => ({ ...c, bal: balances.get(c.id)?.balance ?? 0 }))
      .sort((a, b) => Math.abs(b.bal) - Math.abs(a.bal))
      .slice(0, 5);
  }, [customers, ledger]);

  const absentToday = useMemo(() => {
    const ids = new Set(attendance.filter((a) => a.attendance_date === today && a.status === 'absent').map((a) => a.labour_id));
    return labour.filter((l) => l.active && ids.has(l.id));
  }, [attendance, labour, today]);

  const axisStyle = { fontSize: 11, fill: '#64748b' };
  const tooltipStyle = { borderRadius: 14, border: '1px solid #e0e7ff', fontSize: 12, direction: 'ltr' as const };

  return (
    <div className="space-y-5">
      <FactoryHeader />

      {/* stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={FileText} label={t('dashboard.todaysSales')} value={fmtMoney(stats.todaySales, lang)} tone="indigo" />
        <StatCard icon={HandCoins} label={t('dashboard.monthSales')} value={fmtMoney(stats.monthSales, lang)} tone="violet" />
        <StatCard icon={Banknote} label={t('dashboard.totalReceived')} value={fmtMoney(stats.received, lang)} tone="emerald" />
        <StatCard icon={Wallet} label={t('dashboard.totalRemaining')} value={fmtMoney(stats.remaining, lang)} tone="rose" />
        <StatCard icon={Receipt} label={t('dashboard.totalExpenses')} value={fmtMoney(stats.expensesTotal, lang)} tone="amber" />
        <StatCard
          icon={CalendarCheck}
          label={t('dashboard.todaysAttendance')}
          value={`${fmtNum(stats.presentToday)} / ${fmtNum(stats.activeLabour)}`}
          tone="sky"
        />
        <StatCard icon={Wrench} label={t('dashboard.machinesWorking')} value={fmtNum(stats.machinesWorking)} tone="emerald" />
        <StatCard icon={Boxes} label={t('dashboard.stockItems')} value={fmtNum(stats.stockCount)} tone="violet" />
      </div>

      {/* quick actions */}
      <div>
        <h2 className={`text-lg font-extrabold text-white drop-shadow mb-2.5 ${isUr ? 'font-urdu u-head' : ''}`}>{t('dashboard.quickActions')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <button type="button" className="btn btn-primary btn-lg flex-col !h-auto !py-4" onClick={() => navigate('/invoice/new')}>
            <Plus className="h-7 w-7" />
            <span className={`font-urdu mt-1 ${isUr ? '' : ''}`}>{t('dashboard.newBill')}</span>
          </button>
          <button type="button" className="btn btn-success btn-lg flex-col !h-auto !py-4" onClick={() => navigate('/customers')}>
            <UserPlus className="h-7 w-7" />
            <span className={isUr ? 'font-urdu mt-1' : 'mt-1'}>{t('dashboard.newCustomer')}</span>
          </button>
          <button type="button" className="btn btn-info btn-lg flex-col !h-auto !py-4" onClick={() => navigate('/attendance')}>
            <CalendarCheck className="h-7 w-7" />
            <span className={isUr ? 'font-urdu mt-1' : 'mt-1'}>{t('dashboard.markAttendance')}</span>
          </button>
          <button type="button" className="btn btn-warning btn-lg flex-col !h-auto !py-4" onClick={() => navigate('/expenses')}>
            <Receipt className="h-7 w-7" />
            <span className={isUr ? 'font-urdu mt-1' : 'mt-1'}>{t('dashboard.addExpense')}</span>
          </button>
          <button type="button" className="btn btn-excel btn-lg flex-col !h-auto !py-4" onClick={() => navigate('/stock')}>
            <Boxes className="h-7 w-7" />
            <span className={isUr ? 'font-urdu mt-1' : 'mt-1'}>{t('dashboard.openStock')}</span>
          </button>
        </div>
      </div>

      {/* charts — period selector + sales + received/remaining */}
      <div className="glass rounded-3xl shadow-glass p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className={`text-base font-extrabold text-stone-800 me-auto ${isUr ? 'font-urdu u-text' : ''}`}>{t('dashboard.salesChart')}</h2>
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={`chip chip-period ${period === p.key ? 'chip-active' : ''}`}
            >
              <span className={isUr ? 'font-urdu' : ''}>{t(p.labelKey)}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title={`${t('dashboard.salesChart')} — ${t(PERIODS.find((p) => p.key === period)?.labelKey ?? '')}`} height={250}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={axisStyle} interval='preserveStartEnd' minTickGap={12} />
                <YAxis tick={axisStyle} width={54} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtNum(v)} />
                <Bar dataKey="sales" name={t('reports.sales')} fill="#7c3aed" radius={[7, 7, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t('dashboard.receivedVsRemaining')} icon="line" height={250}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={axisStyle} interval='preserveStartEnd' minTickGap={12} />
                <YAxis tick={axisStyle} width={54} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtNum(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="received" name={t('common.received')} stroke="#059669" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="remaining" name={t('common.remaining')} stroke="#e11d48" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      {/* expenses by category */}
      {byCat.length > 0 && (
        <ChartCard title={t('dashboard.expensesByCategory')} height={250}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byCat} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={axisStyle} />
              <YAxis tick={axisStyle} width={54} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtNum(v)} />
              <Bar dataKey="value" name={t('reports.expensesR')} fill="#0ea5e9" radius={[7, 7, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* latest invoices */}
        <div className="glass rounded-3xl shadow-glass p-4 sm:p-5">
          <div className={`flex items-center justify-between mb-3 ${isUr ? 'font-urdu u-text' : ''}`}>
            <h3 className="font-extrabold text-stone-800">{t('dashboard.latestInvoices')}</h3>
            <button type="button" className="text-sm font-bold text-emerald-600 hover:underline" onClick={() => navigate('/invoices')}>
              {t('common.seeAll')}
            </button>
          </div>
          {latest.length === 0 ? (
            <p className={`text-sm text-stone-400 py-4 ${isUr ? 'font-urdu u-text' : ''}`}>{t('dashboard.noInvoices')}</p>
          ) : (
            <ul className="space-y-2">
              {latest.map((inv) => (
                <li key={inv.id} className="flex items-center gap-3 rounded-2xl bg-teal-50/60 px-3 py-2.5">
                  <FileText className="h-4.5 w-4.5 text-teal-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className={`font-bold text-sm text-stone-800 truncate ${isUr ? 'font-urdu' : ''}`}>{inv.customer_name || '—'}</div>
                    <div className="text-[11px] text-stone-400 tabular-nums" dir="ltr">{inv.invoice_no} · {inv.invoice_date}</div>
                  </div>
                  <div className="text-end">
                    <div className="text-sm font-extrabold text-stone-800 tabular-nums" dir="ltr">{fmtNum(inv.total)}</div>
                    <span className={`chip ${num(inv.remaining) <= 0 ? 'chip-paid' : 'chip-partial'} !text-[10px] ${isUr ? 'font-urdu' : ''}`}>
                      {num(inv.remaining) <= 0 ? t('invoice.paid') : t('invoice.partial')}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* top customers */}
        <div className="glass rounded-3xl shadow-glass p-4 sm:p-5">
          <div className={`flex items-center justify-between mb-3 ${isUr ? 'font-urdu u-text' : ''}`}>
            <h3 className="font-extrabold text-stone-800">{t('dashboard.topCustomers')}</h3>
            <button type="button" className="text-sm font-bold text-emerald-600 hover:underline" onClick={() => navigate('/customers')}>
              {t('common.seeAll')}
            </button>
          </div>
          {topCustomers.length === 0 ? (
            <p className={`text-sm text-stone-400 py-4 ${isUr ? 'font-urdu u-text' : ''}`}>{t('dashboard.noCustomers')}</p>
          ) : (
            <ul className="space-y-2">
              {topCustomers.map((c) => (
                <li key={c.id} className="flex items-center gap-3 rounded-2xl bg-teal-50/60 px-3 py-2.5">
                  <div className={`h-9 w-9 rounded-full grid place-items-center font-extrabold text-white text-sm shrink-0 ${c.bal >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                    {(isUr ? c.name?.[0] ?? '?' : c.name?.[0]?.toUpperCase() ?? '?')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`font-bold text-sm text-stone-800 truncate ${isUr ? 'font-urdu' : ''}`}>{c.name}</div>
                    <div className={`text-[11px] font-semibold ${c.bal >= 0 ? 'text-emerald-600' : 'text-rose-600'} ${isUr ? 'font-urdu' : ''}`}>
                      {c.bal >= 0 ? t('customers.lenaHai') : t('customers.denaHai')}
                    </div>
                  </div>
                  <div className="text-sm font-extrabold text-stone-800 tabular-nums" dir="ltr">{fmtNum(Math.abs(c.bal))}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* absent today */}
        <div className="glass rounded-3xl shadow-glass p-4 sm:p-5">
          <div className={`flex items-center justify-between mb-3 ${isUr ? 'font-urdu u-text' : ''}`}>
            <h3 className="font-extrabold text-stone-800">{t('dashboard.absentToday')}</h3>
            <button type="button" className="text-sm font-bold text-emerald-600 hover:underline" onClick={() => navigate('/attendance')}>
              {t('common.seeAll')}
            </button>
          </div>
          {absentToday.length === 0 ? (
            <p className={`text-sm text-stone-400 py-4 ${isUr ? 'font-urdu u-text' : ''}`}>{t('dashboard.noAbsent')}</p>
          ) : (
            <ul className="space-y-2">
              {absentToday.map((l) => (
                <li key={l.id} className="flex items-center gap-3 rounded-2xl bg-rose-50 px-3 py-2.5">
                  <div className="h-9 w-9 rounded-full bg-rose-500 grid place-items-center text-white font-extrabold text-sm shrink-0">!</div>
                  <div className={`font-bold text-sm text-stone-800 truncate ${isUr ? 'font-urdu' : ''}`}>{l.name}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* full summary export */}
      <div className="glass rounded-3xl shadow-glass p-4 sm:p-5">
        <h3 className={`font-extrabold text-stone-800 mb-3 ${isUr ? 'font-urdu u-text' : ''}`}>{t('reports.title')}</h3>
        <ExportImportBar
          title={isUr ? 'ڈیش بورڈ خلاصہ' : 'Dashboard Summary'}
          filenameBase="dashboard-summary"
          columns={[
            { key: 'label', label: isUr ? 'عنوان' : 'Item' },
            { key: 'value', label: isUr ? 'قیمت' : 'Value', align: 'right' }
          ]}
          rows={[
            { label: t('dashboard.todaysSales'), value: fmtMoney(stats.todaySales, lang) },
            { label: t('dashboard.monthSales'), value: fmtMoney(stats.monthSales, lang) },
            { label: t('dashboard.totalReceived'), value: fmtMoney(stats.received, lang) },
            { label: t('dashboard.totalRemaining'), value: fmtMoney(stats.remaining, lang) },
            { label: t('dashboard.totalExpenses'), value: fmtMoney(stats.expensesTotal, lang) },
            { label: t('dashboard.todaysAttendance'), value: `${stats.presentToday} / ${stats.activeLabour}` },
            { label: t('dashboard.machinesWorking'), value: fmtNum(stats.machinesWorking) },
            { label: t('dashboard.stockItems'), value: fmtNum(stats.stockCount) }
          ]}
        />
      </div>
    </div>
  );
}
