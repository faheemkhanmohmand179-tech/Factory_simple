import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CalendarCheck, ClipboardList, HardHat } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ExportImportBar from '../../components/ui/ExportImportBar';
import { useToast } from '../../components/ui/Toast';
import { useLang } from '../../i18n';
import { useLabour } from '../../hooks/useLabour';
import { LABOUR_CATEGORIES, optLabel, type Labour } from '../../types';
import { fmtDate, fmtNum, num, toLatinDigits } from '../../utils/format';
import { parseDateCell, parseNumCell, type ImportConfig } from '../../import/importExcel';

export default function LabourPage() {
  const { t, lang, isUr } = useLang();
  const toast = useToast();
  const location = useLocation();
  const { rows: labour, loading, insert, update, remove } = useLabour();

  const [q, setQ] = useState('');
  const [modal, setModal] = useState<{ open: boolean; edit?: Labour }>({ open: false });
  const [del, setDel] = useState<Labour | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('helper');
  const [wage, setWage] = useState('');
  const [joinDate, setJoinDate] = useState('');
  const [active, setActive] = useState(true);
  const [notes, setNotes] = useState('');
  const [nameErr, setNameErr] = useState('');

  const filtered = useMemo(() => {
    const needle = toLatinDigits(q.trim().toLowerCase());
    if (!needle) return labour;
    return labour.filter((l) => l.name.toLowerCase().includes(needle) || (l.phone ?? '').includes(needle));
  }, [labour, q]);

  const tabs = [
    { to: '/labour', key: 'labour.tabList', icon: HardHat, active: location.pathname === '/labour' },
    { to: '/attendance', key: 'labour.tabAttendance', icon: CalendarCheck, active: location.pathname === '/attendance' },
    { to: '/labour-report', key: 'labour.tabReports', icon: ClipboardList, active: location.pathname === '/labour-report' }
  ];

  const openAdd = () => {
    setName('');
    setPhone('');
    setCategory('helper');
    setWage('');
    setJoinDate('');
    setActive(true);
    setNotes('');
    setNameErr('');
    setModal({ open: true });
  };

  const openEdit = (l: Labour) => {
    setName(l.name);
    setPhone(l.phone ?? '');
    setCategory(l.category);
    setWage(l.daily_wage != null ? String(l.daily_wage) : '');
    setJoinDate(l.join_date ?? '');
    setActive(l.active);
    setNotes(l.notes ?? '');
    setNameErr('');
    setModal({ open: true, edit: l });
  };

  const save = async () => {
    if (!name.trim()) {
      setNameErr(t('validation.nameEmpty'));
      return;
    }
    const inList = LABOUR_CATEGORIES.some((c) => c.value === category);
    const values = {
      name: name.trim(),
      phone: phone.trim() || null,
      category: inList ? category : 'other',
      custom_category: inList ? null : category,
      daily_wage: num(wage),
      join_date: joinDate || null,
      active,
      notes: notes.trim() || null
    };
    try {
      if (modal.edit) await update(modal.edit.id, values);
      else await insert(values);
      toast.success(t('labour.saved'));
      setModal({ open: false });
    } catch {
      toast.error(navigator.onLine ? t('toast.error') : t('toast.offline'));
    }
  };

  const doDelete = async () => {
    if (!del) return;
    try {
      await remove(del.id);
      toast.success(t('labour.deleted'));
    } catch {
      toast.error(t('toast.error'));
    } finally {
      setDel(null);
    }
  };

  const importCfg: ImportConfig = {
    columns: [
      { key: 'name', labels: ['نام', 'Name'] },
      { key: 'phone', labels: ['فون', 'Phone'] },
      { key: 'category', labels: ['کیٹیگری', 'Category'] },
      { key: 'wage', labels: ['یومیہ اجرت', 'Daily Wage'] },
      { key: 'join', labels: ['تاریخ شمولیت', 'Join Date'] },
      { key: 'note', labels: ['نوٹ', 'Note'] }
    ],
    example: { name: isUr ? 'نور خان' : 'Noor Khan', phone: '0300-1112223', category: isUr ? 'مستری' : 'mistri', wage: 1200, join: '', note: '' },
    mapRow: (raw) => {
      if (!raw.name) return { error: t('validation.nameEmpty') };
      const k = raw.category.trim().toLowerCase();
      let cat = 'other';
      let custom: string | null = null;
      const match = LABOUR_CATEGORIES.find(
        (c) => k === c.value || k.includes(c.ur) || k.includes(c.en.toLowerCase().split(' ')[0])
      );
      if (match) cat = match.value;
      else if (k) custom = raw.category;
      const join = raw.join ? parseDateCell(raw.join) : null;
      return {
        row: {
          name: raw.name,
          phone: raw.phone || null,
          category: cat,
          custom_category: custom,
          daily_wage: parseNumCell(raw.wage) ?? 0,
          join_date: join,
          active: true,
          notes: raw.note || null
        }
      };
    },
    findDuplicate: (existing, mapped) =>
      (existing as Labour[]).find((l) => l.name.trim().toLowerCase() === String(mapped.name).trim().toLowerCase() && (l.phone ?? '') === (mapped.phone ?? '')),
    insertRows: async (rows) => {
      await insert(rows);
    },
    updateRow: async (existing, mapped) => {
      await update((existing as Labour).id, mapped);
    }
  };

  return (
    <div>
      {/* module tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map(({ to, key, icon: Icon, active }) => (
          <Link key={to} to={to} className={`chip ${active ? 'chip-active' : ''}`}>
            <Icon className="h-4 w-4" />
            <span className={isUr ? 'font-urdu' : ''}>{t(key)}</span>
          </Link>
        ))}
      </div>

      <PageHeader title={t('labour.title')} count={filtered.length} addLabel={t('labour.add')} onAdd={openAdd} search={{ value: q, onChange: setQ }} />

      <DataTable
        loading={loading}
        rows={filtered}
        columns={[
          { key: 'name', label: t('common.name') },
          { key: 'phone', label: t('common.phone'), render: (l) => <span dir="ltr" className="tabular-nums">{l.phone || '-'}</span> },
          {
            key: 'category',
            label: t('labour.category'),
            render: (l) => (
              <span className={`chip chip-static ${isUr ? 'font-urdu' : ''}`}>
                {l.custom_category ? l.custom_category : optLabel(LABOUR_CATEGORIES, l.category, lang, l.category)}
              </span>
            )
          },
          { key: 'daily_wage', label: t('labour.dailyWage'), align: 'right', render: (l) => <span className="font-bold">{fmtNum(l.daily_wage)}</span> },
          { key: 'join_date', label: t('labour.joinDate'), render: (l) => <span dir="ltr" className="tabular-nums">{l.join_date ? fmtDate(l.join_date) : '-'}</span> },
          {
            key: 'active',
            label: t('common.status'),
            render: (l) => (
              <span className={`chip ${l.active ? 'chip-paid' : 'chip-partial'} ${isUr ? 'font-urdu' : ''}`}>
                {l.active ? t('common.active') : t('common.inactive')}
              </span>
            )
          }
        ]}
        onEdit={openEdit}
        onDelete={(l) => setDel(l)}
        emptyTitle={t('common.noRecords')}
        emptyHint={t('common.noRecordsHint')}
        emptyActionLabel={t('labour.add')}
        onEmptyAction={openAdd}
      />

      <div className="mt-4">
        <ExportImportBar
          title={t('labour.title')}
          filenameBase="labour"
          importCfg={importCfg}
          columns={[
            { key: 'name', label: t('common.name') },
            { key: 'phone', label: t('common.phone'), get: (l) => l.phone ?? '' },
            { key: 'category', label: t('labour.category'), get: (l) => (l.custom_category ? l.custom_category : optLabel(LABOUR_CATEGORIES, l.category, lang)) },
            { key: 'daily_wage', label: t('labour.dailyWage'), align: 'right', get: (l) => fmtNum(l.daily_wage) },
            { key: 'join_date', label: t('labour.joinDate'), get: (l) => (l.join_date ? fmtDate(l.join_date) : '') },
            { key: 'active', label: t('common.status'), get: (l) => (l.active ? t('common.active') : t('common.inactive')) }
          ]}
          rows={filtered as unknown as Record<string, unknown>[]}
        />
      </div>

      <Modal open={modal.open} onClose={() => setModal({ open: false })} title={modal.edit ? t('labour.edit') : t('labour.add')} dirty={Boolean(modal.edit)} onSave={save}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input label={t('common.name')} value={name} onChange={setName} error={nameErr} icon={HardHat} required />
          </div>
          <Input label={t('common.phone')} value={phone} onChange={(v) => setPhone(toLatinDigits(v))} type="tel" dir="ltr" placeholder={t('customers.phonePh')} />
          <Select
            label={t('labour.category')}
            value={category}
            onChange={setCategory}
            allowCustom
            options={LABOUR_CATEGORIES.map((o) => ({ value: o.value, label: isUr ? o.ur : o.en }))}
          />
          <Input label={t('labour.dailyWage')} value={wage} onChange={(v) => setWage(toLatinDigits(v))} inputMode="decimal" dir="ltr" className="tabular-nums" />
          <Input label={t('labour.joinDate')} type="date" dir="ltr" value={joinDate} onChange={setJoinDate} />
          <div className="sm:col-span-2">
            <label className={`flex items-center gap-3 rounded-2xl bg-teal-50 px-4 py-3.5 cursor-pointer select-none ${isUr ? 'font-urdu u-text' : ''}`}>
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-5 w-5 accent-emerald-600" />
              <span className="font-bold text-stone-700">{t('common.active')}</span>
            </label>
          </div>
          <div className="sm:col-span-2">
            <Input label={t('common.notes')} value={notes} onChange={setNotes} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(del)}
        title={t('common.confirmDeleteTitle')}
        message={t('labour.deleteConfirm')}
        confirmLabel={t('common.delete')}
        onConfirm={doDelete}
        onClose={() => setDel(null)}
      />
    </div>
  );
}
