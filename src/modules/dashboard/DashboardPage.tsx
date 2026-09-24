import { useMemo } from 'react';
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

  const charts = useMemo(() => {
    // last 7 days
    const d7 = Array.from({ length: 7 }).map((_, k) => {
      const d = dayjs().subtract(6 - k, 'day');
      const key = d.format('YYYY-MM-DD');
      const label = d.format('DD-MM');
      return { label, sales: invoices.filter((i) => i.invoice_date === key).reduce((s, i) => s + num(i.total), 0) };
    });
    // last 4 weeks (iso weeks)
    const w4 = Array.from({ length: 4 }).map((_, k) => {
      const wStart = dayjs().subtract(3 - k, 'week').startOf('isoWeek');
      const wEnd = wStart.add(6, 'day');
      const label = `${wStart.format('DD-MM')} ~ ${wEnd.format('DD-MM')}`;
      const sales = invoices
        .filter((i) => dayjs(i.invoice_date).isAfter(wStart.subtract(1, 'day')) && dayjs(i.invoice_date).isBefore(wEnd.add(1, 'day')))
        .reduce((s, i) => s + num(i.total), 0);
      return { label, sales };
    });
    // last 12 months
    const m12 = Array.from({ length: 12 }).map((_, k) => {
      const d = dayjs().subtract(11 - k, 'month');
      const key = d.format('YYYY-MM');
      const label = monthLabel(d.month(), lang);
      return {
        label,
        sales: invoices.filter((i) => (i.invoice_date ?? '').startsWith(key)).reduce((s, i) => s + num(i.total), 0)
      };
    });
    // received vs remaining, last 6 months (line)
    const l6 = Array.from({ length: 6 }).map((_, k) => {
      const d = dayjs().subtract(5 - k, 'month');
      const key = d.format('YYYY-MM');
      const inMonth = invoices.filter((i) => (i.invoice_date ?? '').startsWith(key));
      return {
        label: monthLabel(d.month(), lang),
        received: inMonth.reduce((s, i) => s + num(i.received), 0),
        remaining: inMonth.reduce((s, i) => s + num(i.remaining), 0)
      };
    });
    // expenses by category
    const byCat = EXPENSE_CATEGORIES.map((c) => ({
      label: optLabel(EXPENSE_CATEGORIES, c.value, lang),
      value: expenses.filter((e) => e.category === c.value).reduce((s, e) => s + num(e.amount), 0)
    })).filter((x) => x.value > 0);
    return { d7, w4, m12, l6, byCat };
  }, [invoices, expenses, lang]);

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

      {/* charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title={t('dashboard.salesLast7')} height={250}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.d7} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={axisStyle} />
              <YAxis tick={axisStyle} width={54} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtNum(v)} />
              <Bar dataKey="sales" name={t('reports.sales')} fill="#7c3aed" radius={[7, 7, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t('dashboard.salesLast4W')} height={250}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.w4} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={axisStyle} />
              <YAxis tick={axisStyle} width={54} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtNum(v)} />
              <Bar dataKey="sales" name={t('reports.sales')} fill="#db2777" radius={[7, 7, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t('dashboard.salesLast12M')} height={250}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.m12} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={axisStyle} />
              <YAxis tick={axisStyle} width={54} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtNum(v)} />
              <Bar dataKey="sales" name={t('reports.sales')} fill="#f59e0b" radius={[7, 7, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t('dashboard.receivedVsRemaining')} icon="line" height={250}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={charts.l6} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={axisStyle} />
              <YAxis tick={axisStyle} width={54} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtNum(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="received" name={t('common.received')} stroke="#059669" strokeWidth={3} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="remaining" name={t('common.remaining')} stroke="#e11d48" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {charts.byCat.length > 0 && (
          <ChartCard title={t('dashboard.expensesByCategory')} height={250}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.byCat} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={axisStyle} />
                <YAxis tick={axisStyle} width={54} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtNum(v)} />
                <Bar dataKey="value" name={t('reports.expensesR')} fill="#0ea5e9" radius={[7, 7, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

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
