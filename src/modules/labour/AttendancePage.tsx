import { useMemo, useState } from 'react';
import { CalendarCheck, ClipboardList, HardHat, UserCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { useLang } from '../../i18n';
import { useLabour } from '../../hooks/useLabour';
import { useAttendance } from '../../hooks/useAttendance';
import { fmtNum, num, todayStr, toLatinDigits } from '../../utils/format';
import { parseDateCell, parseNumCell, type ImportConfig } from '../../import/importExcel';
import ExportImportBar from '../../components/ui/ExportImportBar';

const STATUS_BTNS: { value: string; key: string; cls: string }[] = [
  { value: 'present', key: 'attendance.present', cls: 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-teal-500/40' },
  { value: 'absent', key: 'attendance.absent', cls: 'bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/40' },
  { value: 'half', key: 'attendance.halfDay', cls: 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/40' },
  { value: 'leave', key: 'attendance.leave', cls: 'bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-cyan-500/40' }
];

export default function AttendancePage() {
  const { t, lang, isUr } = useLang();
  const toast = useToast();
  const location = useLocation();
  const { rows: labour } = useLabour();
  const { rows: attendance, loading, insert, update, saveAttendance } = useAttendance();

  const [date, setDate] = useState(todayStr());
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const activeLabour = useMemo(() => labour.filter((l) => l.active), [labour]);
  const dayRecords = useMemo(() => attendance.filter((a) => a.attendance_date === date), [attendance, date]);

  const statusOf = (labourId: string) => dayRecords.find((a) => a.labour_id === labourId);

  const filtered = useMemo(() => {
    const needle = toLatinDigits(q.trim().toLowerCase());
    if (!needle) return activeLabour;
    return activeLabour.filter((l) => l.name.toLowerCase().includes(needle));
  }, [activeLabour, q]);

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, half: 0, leave: 0, none: 0 };
    for (const l of activeLabour) {
      const s = statusOf(l.id)?.status;
      if (s && s in c) c[s as keyof typeof c]++;
      else c.none++;
    }
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLabour, dayRecords]);

  const mark = async (labourId: string, labourName: string, status: string) => {
    setBusyId(labourId);
    try {
      await saveAttendance({ labour_id: labourId, labour_name: labourName, attendance_date: date, status, overtime_hours: statusOf(labourId)?.overtime_hours ?? 0 });
      toast.success(t('attendance.savedAuto'));
    } catch {
      toast.error(navigator.onLine ? t('toast.error') : t('toast.offline'));
    } finally {
      setBusyId(null);
    }
  };

  const markAllPresent = async () => {
    try {
      const missing = activeLabour.filter((l) => !statusOf(l.id));
      if (missing.length === 0) {
        toast.info(t('attendance.allMarked'));
        return;
      }
      await insert(
        missing.map((l) => ({ labour_id: l.id, labour_name: l.name, attendance_date: date, status: 'present', overtime_hours: 0 }))
      );
      toast.success(t('attendance.allMarked'));
    } catch {
      toast.error(navigator.onLine ? t('toast.error') : t('toast.offline'));
    }
  };

  const saveOvertime = async (labourId: string, labourName: string, hours: string) => {
    const rec = statusOf(labourId);
    if (!rec) return;
    try {
      await update(rec.id, { labour_id: labourId, labour_name: labourName, attendance_date: date, status: rec.status, overtime_hours: num(hours) });
    } catch {
      toast.error(t('toast.error'));
    }
  };

  // ── import (تاریخ | لیبر کا نام | حاضری | اوور ٹائم گھنٹے) ──
  const importCfg: ImportConfig = {
    columns: [
      { key: 'date', labels: ['تاریخ', 'Date'] },
      { key: 'labour', labels: ['لیبر کا نام', 'Labour Name'] },
      { key: 'status', labels: ['حاضری', 'Status'] },
      { key: 'ot', labels: ['اوور ٹائم گھنٹے', 'Overtime Hours'] }
    ],
    example: { date: todayStr(), labour: isUr ? 'نور خان' : 'Noor Khan', status: isUr ? 'حاضر' : 'present', ot: 0 },
    mapRow: (raw) => {
      const d = parseDateCell(raw.date);
      if (!d) return { error: t('validation.dateInvalid') };
      const lab = activeLabour.find((l) => l.name.trim().toLowerCase() === raw.labour.trim().toLowerCase());
      if (!lab) return { error: t('validation.notFound') };
      const s = raw.status.trim().toLowerCase();
      let status = 'present';
      if (s.includes('غیر') || s.includes('absent')) status = 'absent';
      else if (s.includes('آدھا') || s.includes('half')) status = 'half';
      else if (s.includes('چھٹی') || s.includes('leave')) status = 'leave';
      return {
        row: { labour_id: lab.id, labour_name: lab.name, attendance_date: d, status, overtime_hours: parseNumCell(raw.ot) ?? 0 }
      };
    },
    findDuplicate: (existing, mapped) =>
      (existing as { labour_id: string; attendance_date: string }[]).find(
        (a) => a.labour_id === mapped.labour_id && a.attendance_date === mapped.attendance_date
      ),
    insertRows: async (rows) => {
      await insert(rows);
    },
    updateRow: async (existing, mapped) => {
      await update((existing as { id: string }).id, mapped);
    }
  };

  const tabs = [
    { to: '/labour', key: 'labour.tabList', icon: HardHat, active: location.pathname === '/labour' },
    { to: '/attendance', key: 'labour.tabAttendance', icon: CalendarCheck, active: location.pathname === '/attendance' },
    { to: '/labour-report', key: 'labour.tabReports', icon: ClipboardList, active: location.pathname === '/labour-report' }
  ];

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

      <div className="flex flex-wrap items-end gap-3 mb-4 justify-between">
        <h1 className={`text-2xl sm:text-3xl font-extrabold text-white drop-shadow ${isUr ? 'font-urdu u-head' : ''}`}>{t('attendance.title')}</h1>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-44">
            <Input label={t('common.date')} type="date" dir="ltr" value={date} onChange={setDate} />
          </div>
          <Button variant="success" icon={UserCheck} onClick={() => void markAllPresent()}>
            <span className={isUr ? 'font-urdu' : ''}>{t('attendance.markAllPresent')}</span>
          </Button>
        </div>
      </div>

      {/* summary bar */}
      <div className="glass rounded-3xl shadow-glass px-4 py-3 mb-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className={`font-extrabold text-stone-600 ${isUr ? 'font-urdu u-text' : ''}`}>{t('attendance.summary')}:</span>
        <span className="chip chip-paid">{t('attendance.present')}: <b className="tabular-nums" dir="ltr">{fmtNum(counts.present)}</b></span>
        <span className="chip chip-partial">{t('attendance.absent')}: <b className="tabular-nums" dir="ltr">{fmtNum(counts.absent)}</b></span>
        <span className="chip chip-warn">{t('attendance.halfDay')}: <b className="tabular-nums" dir="ltr">{fmtNum(counts.half)}</b></span>
        <span className="chip chip-info">{t('attendance.leave')}: <b className="tabular-nums" dir="ltr">{fmtNum(counts.leave)}</b></span>
      </div>

      <div className="mb-3 max-w-sm">
        <Input value={q} onChange={setQ} placeholder={t('common.search')} icon={undefined} />
      </div>

      {activeLabour.length === 0 && !loading ? (
        <div className="glass rounded-3xl p-10 text-center">
          <p className={`text-stone-500 font-bold ${isUr ? 'font-urdu u-text' : ''}`}>{t('attendance.noActiveLabour')}</p>
          <Link to="/labour" className="btn btn-primary mt-4 inline-flex">{t('labour.add')}</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map((l) => {
            const rec = statusOf(l.id);
            const ot = rec ? num(rec.overtime_hours) : 0;
            return (
              <div key={l.id} className="glass rounded-3xl shadow-glass p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className={`font-extrabold text-stone-800 truncate ${isUr ? 'font-urdu' : ''}`}>{l.name}</div>
                    <div className="text-xs text-stone-400 tabular-nums" dir="ltr">{t('labour.dailyWage')}: {fmtNum(l.daily_wage)}</div>
                  </div>
                  {rec && <span className={`chip ${rec.status === 'present' ? 'chip-paid' : rec.status === 'absent' ? 'chip-partial' : 'chip-info'}`}>{t(`attendance.${rec.status === 'half' ? 'halfDay' : rec.status}`)}</span>}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {STATUS_BTNS.map((b) => (
                    <button
                      key={b.value}
                      type="button"
                      disabled={busyId === l.id}
                      onClick={() => void mark(l.id, l.name, b.value)}
                      className={`rounded-2xl px-2 min-h-12 font-extrabold text-xs sm:text-sm text-white transition active:scale-95 disabled:opacity-50 ${
                        rec?.status === b.value ? `${b.cls} shadow-lg scale-[1.03] ring-2 ring-white` : 'bg-stone-400/70 hover:bg-stone-500/80'
                      }`}
                    >
                      <span className={isUr ? 'font-urdu' : ''}>{t(b.key)}</span>
                    </button>
                  ))}
                </div>
                {rec && (
                  <div className="mt-3 flex items-center gap-3">
                    <span className={`text-xs font-bold text-stone-500 shrink-0 ${isUr ? 'font-urdu' : ''}`}>{t('attendance.overtimeHours')}:</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      defaultValue={ot ? String(ot) : ''}
                      onBlur={(e) => void saveOvertime(l.id, l.name, toLatinDigits(e.target.value))}
                      className="input !h-10 !py-0 tabular-nums w-24 text-center"
                      placeholder="0"
                    />
                    <span className={`text-xs text-stone-400 ${isUr ? 'font-urdu' : ''}`}>⏱</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4">
        <ExportImportBar
          title={t('attendance.title')}
          filenameBase="attendance"
          importCfg={importCfg}
          columns={[
            { key: 'attendance_date', label: t('common.date'), get: (a) => a.attendance_date },
            { key: 'labour_name', label: t('common.name'), get: (a) => a.labour_name ?? '' },
            { key: 'status', label: t('common.status'), get: (a) => t(`attendance.${a.status === 'half' ? 'halfDay' : a.status}`) },
            { key: 'overtime_hours', label: t('attendance.overtimeHours'), align: 'right', get: (a) => fmtNum(a.overtime_hours) }
          ]}
          rows={dayRecords as unknown as Record<string, unknown>[]}
        />
      </div>
    </div>
  );
}
