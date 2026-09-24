import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarCheck, ClipboardList, HandCoins, HardHat } from 'lucide-react';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import ChartCard from '../../components/ui/ChartCard';
import DataTable from '../../components/ui/DataTable';
import ExportImportBar from '../../components/ui/ExportImportBar';
import { useToast } from '../../components/ui/Toast';
import { useLang } from '../../i18n';
import { useLabour } from '../../hooks/useLabour';
import { useAttendance } from '../../hooks/useAttendance';
import { dayjs, fmtNum, num, todayStr } from '../../utils/format';

type Mode = 'daily' | 'weekly' | 'monthly';

export default function LabourReportPage() {
  const { t, isUr } = useLang();
  const toast = useToast();
  const location = useLocation();
  const { rows: labour, payments, insert: insertPayment } = useLabour();
  const { rows: attendance } = useAttendance();

  const [mode, setMode] = useState<Mode>('weekly');
  const defaultFrom = mode === 'daily' ? todayStr() : mode === 'weekly' ? dayjs().startOf('isoWeek').format('YYYY-MM-DD') : dayjs().startOf('month').format('YYYY-MM-DD');
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(todayStr());

  // pay wages modal
  const [payFor, setPayFor] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payFrom, setPayFrom] = useState('');
  const [payTo, setPayTo] = useState('');
  const [payNote, setPayNote] = useState('');
  const [amountErr, setAmountErr] = useState('');

  const inRange = (d: string) => d >= from && d <= to;

  const report = useMemo(() => {
    return labour
      .filter((l) => l.active)
      .map((l) => {
        const recs = attendance.filter((a) => a.labour_id === l.id && inRange(a.attendance_date));
        const present = recs.filter((a) => a.status === 'present').length;
        const absent = recs.filter((a) => a.status === 'absent').length;
        const half = recs.filter((a) => a.status === 'half').length;
        const leave = recs.filter((a) => a.status === 'leave').length;
        const ot = recs.reduce((s, a) => s + num(a.overtime_hours), 0);
        const wage = num(l.daily_wage);
        // simple shopkeeper math: حاضر × اجرت + آدھا دن آدھی اجرت + اوور ٹائم گھنٹے × اجرت کا آٹھواں حصہ
        const earned = present * wage + (half * wage) / 2 + ot * (wage / 8);
        const paid = payments.filter((p) => p.labour_id === l.id).reduce((s, p) => s + num(p.amount), 0);
        return { labour: l, present, absent, half, leave, ot, wage, earned, paid, remaining: earned - paid };
      })
      .filter((r) => r.present + r.absent + r.half + r.leave > 0 || r.paid > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labour, attendance, payments, from, to]);

  // attendance per day (bar chart)
  const chartData = useMemo(() => {
    const days: { label: string; present: number; absent: number }[] = [];
    let d = dayjs(from);
    const end = dayjs(to);
    let guard = 0;
    while ((d.isBefore(end) || d.isSame(end)) && guard < 92) {
      const key = d.format('YYYY-MM-DD');
      days.push({
        label: d.format('DD-MM'),
        present: attendance.filter((a) => a.attendance_date === key && a.status === 'present').length,
        absent: attendance.filter((a) => a.attendance_date === key && (a.status === 'absent' || a.status === 'half')).length
      });
      d = d.add(1, 'day');
      guard++;
    }
    return days;
  }, [attendance, from, to]);

  const totals = useMemo(
    () => ({
      earned: report.reduce((s, r) => s + r.earned, 0),
      paid: report.reduce((s, r) => s + r.paid, 0),
      remaining: report.reduce((s, r) => s + r.remaining, 0)
    }),
    [report]
  );

  const openPay = (labourId: string) => {
    setPayAmount('');
    setPayFrom(from);
    setPayTo(to);
    setPayNote('');
    setAmountErr('');
    setPayFor(labourId);
  };

  const savePayment = async () => {
    if (num(payAmount) <= 0) {
      setAmountErr(t('validation.amountEmpty'));
      return;
    }
    const l = labour.find((x) => x.id === payFor);
    if (!l) return;
    try {
      await insertPayment({
        labour_id: l.id,
        labour_name: l.name,
        payment_date: todayStr(),
        amount: num(payAmount),
        period_from: payFrom || null,
        period_to: payTo || null,
        note: payNote.trim() || null
      });
      toast.success(t('labourReport.paymentSaved'));
      setPayFor(null);
    } catch {
      toast.error(navigator.onLine ? t('toast.error') : t('toast.offline'));
    }
  };

  const tabs = [
    { to: '/labour', key: 'labour.tabList', icon: HardHat, active: location.pathname === '/labour' },
    { to: '/attendance', key: 'labour.tabAttendance', icon: CalendarCheck, active: location.pathname === '/attendance' },
    { to: '/labour-report', key: 'labour.tabReports', icon: ClipboardList, active: location.pathname === '/labour-report' }
  ];

  const modes: { key: Mode; label: string }[] = [
    { key: 'daily', label: t('labourReport.daily') },
    { key: 'weekly', label: t('labourReport.weekly') },
    { key: 'monthly', label: t('labourReport.monthly') }
  ];

  const axisStyle = { fontSize: 11, fill: '#64748b' };
  const tooltipStyle = { borderRadius: 14, border: '1px solid #e0e7ff', fontSize: 12, direction: 'ltr' as const };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map(({ to, key, icon: Icon, active }) => (
          <Link key={to} to={to} className={`chip ${active ? 'chip-active' : ''}`}>
            <Icon className="h-4 w-4" />
            <span className={isUr ? 'font-urdu' : ''}>{t(key)}</span>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <h1 className={`text-2xl sm:text-3xl font-extrabold text-white drop-shadow ${isUr ? 'font-urdu u-head' : ''}`}>{t('labourReport.title')}</h1>
        <div className="flex flex-wrap items-end gap-2.5">
          {modes.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => {
                setMode(m.key);
                if (m.key === 'daily') setFrom(todayStr());
                if (m.key === 'weekly') setFrom(dayjs().startOf('isoWeek').format('YYYY-MM-DD'));
                if (m.key === 'monthly') setFrom(dayjs().startOf('month').format('YYYY-MM-DD'));
                setTo(todayStr());
              }}
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
        </div>
      </div>

      {report.length === 0 ? (
        <div className="glass rounded-3xl p-10 text-center">
          <p className={`text-stone-500 font-bold ${isUr ? 'font-urdu u-text' : ''}`}>{t('labourReport.noData')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <ChartCard title={t('attendance.title')} height={240}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={axisStyle} />
                <YAxis tick={axisStyle} width={30} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="present" name={t('labourReport.present')} stackId="a" fill="#059669" radius={[0, 0, 0, 0]} />
                <Bar dataKey="absent" name={t('labourReport.absent')} stackId="a" fill="#e11d48" radius={[7, 7, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <DataTable
            rows={report}
            rowKey={(r) => r.labour.id}
            columns={[
              { key: 'name', label: t('common.name'), render: (r) => <span className={isUr ? 'font-urdu' : ''}>{r.labour.name}</span> },
              { key: 'present', label: t('labourReport.present'), align: 'right', render: (r) => fmtNum(r.present) },
              { key: 'absent', label: t('labourReport.absent'), align: 'right', render: (r) => fmtNum(r.absent) },
              { key: 'half', label: t('labourReport.half'), align: 'right', render: (r) => fmtNum(r.half) },
              { key: 'ot', label: t('labourReport.overtimeHrs'), align: 'right', render: (r) => fmtNum(r.ot) },
              { key: 'wage', label: t('labourReport.wage'), align: 'right', render: (r) => fmtNum(r.wage) },
              { key: 'earned', label: t('labourReport.earned'), align: 'right', render: (r) => <b>{fmtNum(r.earned)}</b> },
              { key: 'paid', label: t('labourReport.paid'), align: 'right', render: (r) => <span className="text-emerald-700 font-bold">{fmtNum(r.paid)}</span> },
              {
                key: 'remaining',
                label: t('labourReport.remaining'),
                align: 'right',
                render: (r) => <span className={`font-extrabold ${r.remaining > 0 ? 'text-rose-600' : 'text-stone-400'}`}>{fmtNum(r.remaining)}</span>
              }
            ]}
            extraActions={(r) => (
              <button
                type="button"
                title={t('labourReport.payWages')}
                onClick={() => openPay(r.labour.id)}
                className="h-11 w-11 grid place-items-center rounded-xl bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition active:scale-95"
              >
                <HandCoins className="h-4.5 w-4.5" />
              </button>
            )}
            footer={
              <tr>
                <td className="px-4 py-3.5">{t('common.total')}</td>
                <td colSpan={5} />
                <td className="px-4 py-3.5 text-end tabular-nums">{fmtNum(totals.earned)}</td>
                <td className="px-4 py-3.5 text-end tabular-nums">{fmtNum(totals.paid)}</td>
                <td className="px-4 py-3.5 text-end tabular-nums text-rose-600">{fmtNum(totals.remaining)}</td>
                <td />
              </tr>
            }
          />

          <ExportImportBar
            title={`${t('labourReport.title')} (${from} → ${to})`}
            filenameBase="labour-report"
            columns={[
              { key: 'name', label: t('common.name'), get: (r) => r.labour.name },
              { key: 'present', label: t('labourReport.present'), align: 'right', get: (r) => fmtNum(r.present) },
              { key: 'absent', label: t('labourReport.absent'), align: 'right', get: (r) => fmtNum(r.absent) },
              { key: 'half', label: t('labourReport.half'), align: 'right', get: (r) => fmtNum(r.half) },
              { key: 'ot', label: t('labourReport.overtimeHrs'), align: 'right', get: (r) => fmtNum(r.ot) },
              { key: 'wage', label: t('labourReport.wage'), align: 'right', get: (r) => fmtNum(r.wage) },
              { key: 'earned', label: t('labourReport.earned'), align: 'right', get: (r) => fmtNum(r.earned) },
              { key: 'paid', label: t('labourReport.paid'), align: 'right', get: (r) => fmtNum(r.paid) },
              { key: 'remaining', label: t('labourReport.remaining'), align: 'right', get: (r) => fmtNum(r.remaining) }
            ]}
            rows={report as unknown as Record<string, unknown>[]}
            summary={[
              { label: t('labourReport.earned'), value: fmtNum(totals.earned) },
              { label: t('labourReport.paid'), value: fmtNum(totals.paid) },
              { label: t('labourReport.remaining'), value: fmtNum(totals.remaining) }
            ]}
          />
        </div>
      )}

      {/* pay wages modal */}
      <Modal
        open={Boolean(payFor)}
        onClose={() => setPayFor(null)}
        title={`${t('labourReport.payWages')} — ${labour.find((l) => l.id === payFor)?.name ?? ''}`}
        onSave={savePayment}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t('labourReport.payAmount')}
            value={payAmount}
            onChange={(v) => {
              setPayAmount(v);
              setAmountErr('');
            }}
            inputMode="decimal"
            dir="ltr"
            className="tabular-nums !text-lg font-extrabold"
            error={amountErr}
          />
          <Input label={t('labourReport.payNote')} value={payNote} onChange={setPayNote} />
          <Input label={t('labourReport.periodFrom')} type="date" dir="ltr" value={payFrom} onChange={setPayFrom} />
          <Input label={t('labourReport.periodTo')} type="date" dir="ltr" value={payTo} onChange={setPayTo} />
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="success" onClick={savePayment}>
            {t('common.save')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
