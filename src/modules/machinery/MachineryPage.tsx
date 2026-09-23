import { useMemo, useState } from 'react';
import { LayoutGrid, Rows3, Wrench } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ExportImportBar from '../../components/ui/ExportImportBar';
import { useToast } from '../../components/ui/Toast';
import { useLang } from '../../i18n';
import { useMachinery } from '../../hooks/useMachinery';
import { MACHINE_STATUS, MACHINE_TYPES, optLabel, type Machinery, type Maintenance } from '../../types';
import { fmtDate, fmtNum, num, toLatinDigits } from '../../utils/format';
import { parseDateCell, parseNumCell, type ImportConfig } from '../../import/importExcel';

export default function MachineryPage() {
  const { t, lang, isUr } = useLang();
  const toast = useToast();
  const { rows: machines, maintenance, loading, insert, update, remove, insertMaintenance, removeMaintenance } = useMachinery();

  const [q, setQ] = useState('');
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [modal, setModal] = useState<{ open: boolean; edit?: Machinery }>({ open: false });
  const [del, setDel] = useState<Machinery | null>(null);
  const [logFor, setLogFor] = useState<Machinery | null>(null);
  const [delLog, setDelLog] = useState<Maintenance | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState('cutter');
  const [model, setModel] = useState('');
  const [status, setStatus] = useState('working');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [nameErr, setNameErr] = useState('');

  // add-log form
  const [logDate, setLogDate] = useState('');
  const [logDesc, setLogDesc] = useState('');
  const [logCost, setLogCost] = useState('');

  const filtered = useMemo(() => {
    const needle = toLatinDigits(q.trim().toLowerCase());
    if (!needle) return machines;
    return machines.filter(
      (m) => m.name.toLowerCase().includes(needle) || (m.model ?? '').toLowerCase().includes(needle)
    );
  }, [machines, q]);

  const logsOf = (machineId: string) => maintenance.filter((l) => l.machine_id === machineId);
  const maintenanceTotal = (machineId: string) => logsOf(machineId).reduce((s, l) => s + num(l.cost), 0);

  const openAdd = () => {
    setName('');
    setType('cutter');
    setModel('');
    setStatus('working');
    setPurchaseDate('');
    setCost('');
    setNotes('');
    setNameErr('');
    setModal({ open: true });
  };

  const openEdit = (m: Machinery) => {
    setName(m.name);
    setType(m.custom_type ?? m.type);
    setModel(m.model ?? '');
    setStatus(m.status);
    setPurchaseDate(m.purchase_date ?? '');
    setCost(m.cost != null ? String(m.cost) : '');
    setNotes(m.notes ?? '');
    setNameErr('');
    setModal({ open: true, edit: m });
  };

  const save = async () => {
    if (!name.trim()) {
      setNameErr(t('validation.nameEmpty'));
      return;
    }
    const inList = MACHINE_TYPES.some((c) => c.value === type);
    const values = {
      name: name.trim(),
      type: inList ? type : 'other',
      custom_type: inList ? null : type,
      model: model.trim() || null,
      status,
      purchase_date: purchaseDate || null,
      cost: num(cost),
      notes: notes.trim() || null
    };
    try {
      if (modal.edit) await update(modal.edit.id, values);
      else await insert(values);
      toast.success(t('machinery.saved'));
      setModal({ open: false });
    } catch {
      toast.error(navigator.onLine ? t('toast.error') : t('toast.offline'));
    }
  };

  const doDelete = async () => {
    if (!del) return;
    try {
      await remove(del.id);
      toast.success(t('machinery.deleted'));
    } catch {
      toast.error(t('toast.error'));
    } finally {
      setDel(null);
    }
  };

  const addLog = async () => {
    if (!logFor) return;
    try {
      await insertMaintenance({
        machine_id: logFor.id,
        log_date: logDate || new Date().toISOString().slice(0, 10),
        description: logDesc.trim() || null,
        cost: num(logCost)
      });
      setLogDate('');
      setLogDesc('');
      setLogCost('');
      toast.success(t('common.savedToast'));
    } catch {
      toast.error(navigator.onLine ? t('toast.error') : t('toast.offline'));
    }
  };

  const importCfg: ImportConfig = {
    columns: [
      { key: 'name', labels: ['نام', 'Name'] },
      { key: 'type', labels: ['قسم', 'Type'] },
      { key: 'model', labels: ['ماڈل', 'Model'] },
      { key: 'status', labels: ['حالت', 'Status'] },
      { key: 'purchase', labels: ['تاریخ خریداری', 'Purchase Date'] },
      { key: 'cost', labels: ['قیمت', 'Cost'] },
      { key: 'note', labels: ['نوٹ', 'Note'] }
    ],
    example: { name: isUr ? 'کٹر مشین' : 'Cutter Machine', type: isUr ? 'کٹر' : 'cutter', model: 'XYZ-2000', status: isUr ? 'چل رہی ہے' : 'working', purchase: '', cost: 500000, note: '' },
    mapRow: (raw) => {
      if (!raw.name) return { error: t('validation.nameEmpty') };
      const k = raw.type.trim().toLowerCase();
      const mMatch = MACHINE_TYPES.find((c) => k === c.value || k.includes(c.ur) || k.includes(c.en.toLowerCase()));
      const s = raw.status.trim().toLowerCase();
      let st = 'working';
      if (s.includes('مرمت') || s.includes('repair')) st = 'repair';
      else if (s.includes('بند') || s.includes('idle')) st = 'idle';
      return {
        row: {
          name: raw.name,
          type: mMatch ? mMatch.value : 'other',
          custom_type: mMatch ? null : raw.type || null,
          model: raw.model || null,
          status: st,
          purchase_date: raw.purchase ? parseDateCell(raw.purchase) : null,
          cost: parseNumCell(raw.cost) ?? 0,
          notes: raw.note || null
        }
      };
    },
    findDuplicate: (existing, mapped) =>
      (existing as Machinery[]).find((m) => m.name.trim().toLowerCase() === String(mapped.name).trim().toLowerCase() && (m.model ?? '') === (mapped.model ?? '')),
    insertRows: async (rows) => {
      await insert(rows);
    },
    updateRow: async (existing, mapped) => {
      await update((existing as Machinery).id, mapped);
    }
  };

  const statusChip = (m: Machinery) => (
    <span className={`chip ${m.status === 'working' ? 'chip-paid' : m.status === 'repair' ? 'chip-partial' : 'chip-info'} ${isUr ? 'font-urdu' : ''}`}>
      {optLabel(MACHINE_STATUS, m.status, lang, m.status)}
    </span>
  );

  return (
    <div>
      <PageHeader title={t('machinery.title')} count={filtered.length} addLabel={t('machinery.add')} onAdd={openAdd} search={{ value: q, onChange: setQ }}>
        <button type="button" onClick={() => setView('grid')} className={`chip ${view === 'grid' ? 'chip-active' : ''}`}>
          <LayoutGrid className="h-4 w-4" /> <span className={isUr ? 'font-urdu' : ''}>{t('machinery.gridView')}</span>
        </button>
        <button type="button" onClick={() => setView('table')} className={`chip ${view === 'table' ? 'chip-active' : ''}`}>
          <Rows3 className="h-4 w-4" /> <span className={isUr ? 'font-urdu' : ''}>{t('machinery.listView')}</span>
        </button>
      </PageHeader>

      {view === 'table' ? (
        <DataTable
          loading={loading}
          rows={filtered}
          columns={[
            { key: 'name', label: t('common.name') },
            { key: 'type', label: t('machinery.machineType'), render: (m) => <span className={`chip chip-static ${isUr ? 'font-urdu' : ''}`}>{m.custom_type ?? optLabel(MACHINE_TYPES, m.type, lang, m.type)}</span> },
            { key: 'model', label: t('machinery.model'), render: (m) => m.model || '-' },
            { key: 'status', label: t('machinery.status'), render: statusChip },
            { key: 'purchase_date', label: t('machinery.purchaseDate'), render: (m) => <span dir="ltr" className="tabular-nums">{m.purchase_date ? fmtDate(m.purchase_date) : '-'}</span> },
            { key: 'cost', label: t('machinery.cost'), align: 'right', render: (m) => fmtNum(m.cost) },
            { key: 'maint', label: t('machinery.maintenance'), align: 'right', render: (m) => fmtNum(maintenanceTotal(m.id)) }
          ]}
          extraActions={(m) => (
            <button
              type="button"
              title={t('machinery.maintenanceLog')}
              onClick={() => setLogFor(m)}
              className="h-11 w-11 grid place-items-center rounded-xl bg-amber-100 text-amber-600 hover:bg-amber-200 transition active:scale-95"
            >
              <Wrench className="h-4.5 w-4.5" />
            </button>
          )}
          onEdit={openEdit}
          onDelete={(m) => setDel(m)}
          emptyTitle={t('machinery.noMachines')}
          emptyHint={t('common.noRecordsHint')}
          emptyActionLabel={t('machinery.add')}
          onEmptyAction={openAdd}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading &&
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="glass rounded-3xl h-40 animate-pulse" />)}
          {!loading && filtered.length === 0 && (
            <div className="glass rounded-3xl p-10 text-center sm:col-span-2 xl:col-span-3">
              <p className={`text-slate-500 font-bold ${isUr ? 'font-urdu u-text' : ''}`}>{t('machinery.noMachines')}</p>
              <Button variant="primary" className="mt-4 mx-auto" onClick={openAdd}>{t('machinery.add')}</Button>
            </div>
          )}
          {filtered.map((m) => (
            <div key={m.id} className="glass rounded-3xl shadow-glass p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-12 w-12 shrink-0 rounded-2xl grid place-items-center text-white shadow-lg ${
                    m.status === 'working' ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : m.status === 'repair' ? 'bg-gradient-to-br from-rose-500 to-red-600' : 'bg-gradient-to-br from-slate-400 to-slate-500'
                  }`}>
                    <Wrench className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className={`font-extrabold text-slate-800 truncate ${isUr ? 'font-urdu' : ''}`}>{m.name}</div>
                    <div className="text-xs text-slate-400 truncate">{m.model || '—'}</div>
                  </div>
                </div>
                {statusChip(m)}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-2xl bg-indigo-50 px-3 py-2">
                  <div className="text-[10px] font-bold text-slate-400">{t('machinery.machineType')}</div>
                  <div className={`font-bold text-slate-700 ${isUr ? 'font-urdu' : ''}`}>{m.custom_type ?? optLabel(MACHINE_TYPES, m.type, lang, m.type)}</div>
                </div>
                <div className="rounded-2xl bg-indigo-50 px-3 py-2">
                  <div className="text-[10px] font-bold text-slate-400">{t('machinery.cost')}</div>
                  <div className="font-bold text-slate-700 tabular-nums" dir="ltr">{fmtNum(m.cost)}</div>
                </div>
                <div className="rounded-2xl bg-indigo-50 px-3 py-2">
                  <div className="text-[10px] font-bold text-slate-400">{t('machinery.purchaseDate')}</div>
                  <div className="font-bold text-slate-700 tabular-nums" dir="ltr">{m.purchase_date ? fmtDate(m.purchase_date) : '—'}</div>
                </div>
                <div className="rounded-2xl bg-indigo-50 px-3 py-2">
                  <div className="text-[10px] font-bold text-slate-400">{t('machinery.maintenance')}</div>
                  <div className="font-bold text-slate-700 tabular-nums" dir="ltr">{fmtNum(maintenanceTotal(m.id))}</div>
                </div>
              </div>
              {m.notes && <p className={`text-xs text-slate-500 ${isUr ? 'font-urdu u-text' : ''}`}>{m.notes}</p>}
              <div className="flex flex-wrap gap-2 mt-auto pt-1">
                <Button size="sm" variant="warning" icon={Wrench} onClick={() => setLogFor(m)}>{t('machinery.maintenance')}</Button>
                <Button size="sm" variant="info" onClick={() => openEdit(m)}>{t('common.edit')}</Button>
                <Button size="sm" variant="danger" onClick={() => setDel(m)}>{t('common.delete')}</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <ExportImportBar
          title={t('machinery.title')}
          filenameBase="machinery"
          importCfg={importCfg}
          columns={[
            { key: 'name', label: t('common.name') },
            { key: 'type', label: t('machinery.machineType'), get: (m) => m.custom_type ?? optLabel(MACHINE_TYPES, m.type, lang) },
            { key: 'model', label: t('machinery.model'), get: (m) => m.model ?? '' },
            { key: 'status', label: t('machinery.status'), get: (m) => optLabel(MACHINE_STATUS, m.status, lang) },
            { key: 'purchase_date', label: t('machinery.purchaseDate'), get: (m) => (m.purchase_date ? fmtDate(m.purchase_date) : '') },
            { key: 'cost', label: t('machinery.cost'), align: 'right', get: (m) => fmtNum(m.cost) },
            { key: 'maint', label: t('machinery.maintenance'), align: 'right', get: (m) => fmtNum(maintenanceTotal(m.id)) }
          ]}
          rows={filtered as unknown as Record<string, unknown>[]}
        />
      </div>

      {/* add/edit modal */}
      <Modal open={modal.open} onClose={() => setModal({ open: false })} title={modal.edit ? t('machinery.edit') : t('machinery.add')} dirty={Boolean(modal.edit)} onSave={save}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input label={t('common.name')} value={name} onChange={setName} error={nameErr} icon={Wrench} required />
          </div>
          <Select label={t('machinery.machineType')} value={type} onChange={setType} allowCustom options={MACHINE_TYPES.map((o) => ({ value: o.value, label: isUr ? o.ur : o.en }))} />
          <Select label={t('machinery.status')} value={status} onChange={setStatus} options={MACHINE_STATUS.map((o) => ({ value: o.value, label: isUr ? o.ur : o.en }))} />
          <Input label={t('machinery.model')} value={model} onChange={setModel} dir="ltr" />
          <Input label={t('machinery.cost')} value={cost} onChange={(v) => setCost(toLatinDigits(v))} inputMode="decimal" dir="ltr" className="tabular-nums" />
          <div className="sm:col-span-2">
            <Input label={t('machinery.purchaseDate')} type="date" dir="ltr" value={purchaseDate} onChange={setPurchaseDate} />
          </div>
          <div className="sm:col-span-2">
            <Input label={t('common.notes')} value={notes} onChange={setNotes} />
          </div>
        </div>
      </Modal>

      {/* maintenance log modal */}
      <Modal
        open={Boolean(logFor)}
        onClose={() => setLogFor(null)}
        title={`${t('machinery.maintenanceLog')} — ${logFor?.name ?? ''}`}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="neutral" onClick={() => setLogFor(null)}>{t('common.close')}</Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5">
          <Input label={t('machinery.logDate')} type="date" dir="ltr" value={logDate} onChange={setLogDate} />
          <div className="sm:col-span-2">
            <Input label={t('machinery.logDesc')} value={logDesc} onChange={setLogDesc} />
          </div>
          <Input label={t('machinery.logCost')} value={logCost} onChange={(v) => setLogCost(toLatinDigits(v))} inputMode="decimal" dir="ltr" className="tabular-nums" />
        </div>
        <Button variant="success" size="sm" onClick={() => void addLog()}>{t('machinery.addLog')}</Button>

        <div className="mt-4 space-y-2">
          {logsOf(logFor?.id ?? '').length === 0 ? (
            <p className={`text-sm text-slate-400 text-center py-6 ${isUr ? 'font-urdu u-text' : ''}`}>{t('machinery.noLogs')}</p>
          ) : (
            logsOf(logFor?.id ?? '')
              .sort((a, b) => (a.log_date < b.log_date ? 1 : -1))
              .map((l) => (
                <div key={l.id} className="flex items-center gap-3 rounded-2xl bg-indigo-50/70 px-4 py-3">
                  <div className="tabular-nums text-xs font-bold text-slate-500 shrink-0" dir="ltr">{fmtDate(l.log_date)}</div>
                  <div className={`flex-1 text-sm font-semibold text-slate-700 truncate ${isUr ? 'font-urdu' : ''}`}>{l.description || '—'}</div>
                  <div className="font-extrabold text-slate-800 tabular-nums" dir="ltr">{fmtNum(l.cost)}</div>
                  <button
                    type="button"
                    onClick={() => setDelLog(l)}
                    className="h-10 w-10 grid place-items-center rounded-xl bg-rose-100 text-rose-600 active:scale-95"
                  >
                    ×
                  </button>
                </div>
              ))
          )}
        </div>
        {logFor && (
          <div className={`mt-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3 font-extrabold flex justify-between ${isUr ? 'font-urdu u-text' : ''}`}>
            <span>{t('machinery.totalMaintenance')}:</span>
            <span className="tabular-nums" dir="ltr">{fmtNum(maintenanceTotal(logFor.id))}</span>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={Boolean(del)} title={t('common.confirmDeleteTitle')} message={t('machinery.deleteConfirm')} confirmLabel={t('common.delete')} onConfirm={doDelete} onClose={() => setDel(null)} />
      <ConfirmDialog
        open={Boolean(delLog)}
        title={t('common.confirmDeleteTitle')}
        message={t('machinery.deleteConfirm')}
        confirmLabel={t('common.delete')}
        onConfirm={async () => {
          if (delLog) {
            try {
              await removeMaintenance(delLog.id);
              toast.success(t('common.deletedToast'));
            } catch {
              toast.error(t('toast.error'));
            }
          }
          setDelLog(null);
        }}
        onClose={() => setDelLog(null)}
      />
    </div>
  );
}
