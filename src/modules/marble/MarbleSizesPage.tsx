import { useMemo, useState } from 'react';
import { LayoutGrid, Rows3, Ruler } from 'lucide-react';
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
import { useMarbleSizes } from '../../hooks/useMarbleSizes';
import { SIZE_UNITS, type MarbleSize } from '../../types';
import { fmtNum, num, toLatinDigits } from '../../utils/format';
import { parseNumCell, type ImportConfig } from '../../import/importExcel';

export default function MarbleSizesPage() {
  const { t, isUr } = useLang();
  const toast = useToast();
  const { rows: sizes, loading, insert, update, remove } = useMarbleSizes();

  const [q, setQ] = useState('');
  const [view, setView] = useState<'table' | 'grid'>('table');
  const [modal, setModal] = useState<{ open: boolean; edit?: MarbleSize }>({ open: false });
  const [del, setDel] = useState<MarbleSize | null>(null);

  const [label, setLabel] = useState('');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [unit, setUnit] = useState('inch');
  const [notes, setNotes] = useState('');
  const [labelErr, setLabelErr] = useState('');

  const filtered = useMemo(() => {
    const needle = toLatinDigits(q.trim().toLowerCase());
    if (!needle) return sizes;
    return sizes.filter((s) => s.label.toLowerCase().includes(needle));
  }, [sizes, q]);

  const openAdd = () => {
    setLabel('');
    setLength('');
    setWidth('');
    setUnit('inch');
    setNotes('');
    setLabelErr('');
    setModal({ open: true });
  };

  const openEdit = (s: MarbleSize) => {
    setLabel(s.label);
    setLength(s.length_in != null ? String(s.length_in) : '');
    setWidth(s.width_in != null ? String(s.width_in) : '');
    setUnit(s.unit);
    setNotes(s.notes ?? '');
    setLabelErr('');
    setModal({ open: true, edit: s });
  };

  const save = async () => {
    if (!label.trim()) {
      setLabelErr(t('validation.nameEmpty'));
      return;
    }
    const values = {
      label: label.trim(),
      length_in: num(length),
      width_in: num(width),
      unit,
      is_custom: modal.edit ? modal.edit.is_custom : true,
      notes: notes.trim() || null
    };
    try {
      if (modal.edit) await update(modal.edit.id, values);
      else await insert(values);
      toast.success(t('marbleSizes.saved'));
      setModal({ open: false });
    } catch {
      toast.error(navigator.onLine ? t('toast.error') : t('toast.offline'));
    }
  };

  const doDelete = async () => {
    if (!del) return;
    try {
      await remove(del.id);
      toast.success(t('marbleSizes.deleted'));
    } catch {
      toast.error(t('toast.error'));
    } finally {
      setDel(null);
    }
  };

  const importCfg: ImportConfig = {
    columns: [
      { key: 'label', labels: ['سائز', 'Size'] },
      { key: 'length', labels: ['لمبائی', 'Length'] },
      { key: 'width', labels: ['چوڑائی', 'Width'] },
      { key: 'unit', labels: ['یونٹ', 'Unit'] },
      { key: 'note', labels: ['نوٹ', 'Note'] }
    ],
    example: { label: '30x30', length: 30, width: 30, unit: isUr ? 'انچ' : 'inch', note: '' },
    mapRow: (raw) => {
      if (!raw.label) return { error: t('validation.nameEmpty') };
      const u = raw.unit.trim().toLowerCase();
      const unit = u.includes('فٹ') || u.includes('feet') || u === 'ft' ? 'feet' : 'inch';
      return {
        row: { label: raw.label, length_in: parseNumCell(raw.length) ?? 0, width_in: parseNumCell(raw.width) ?? 0, unit, is_custom: true, notes: raw.note || null }
      };
    },
    findDuplicate: (existing, mapped) => (existing as MarbleSize[]).find((s) => s.label.toLowerCase() === String(mapped.label).toLowerCase()),
    insertRows: async (rows) => {
      await insert(rows);
    },
    updateRow: async (existing, mapped) => {
      await update((existing as MarbleSize).id, mapped);
    }
  };

  return (
    <div>
      <PageHeader title={t('marbleSizes.title')} count={filtered.length} addLabel={t('marbleSizes.add')} onAdd={openAdd} search={{ value: q, onChange: setQ }}>
        <button type="button" onClick={() => setView('table')} className={`chip ${view === 'table' ? 'chip-active' : ''}`}>
          <Rows3 className="h-4 w-4" /> <span className={isUr ? 'font-urdu' : ''}>{t('machinery.listView')}</span>
        </button>
        <button type="button" onClick={() => setView('grid')} className={`chip ${view === 'grid' ? 'chip-active' : ''}`}>
          <LayoutGrid className="h-4 w-4" /> <span className={isUr ? 'font-urdu' : ''}>{t('machinery.gridView')}</span>
        </button>
      </PageHeader>

      {view === 'table' ? (
        <DataTable
          loading={loading}
          rows={filtered}
          columns={[
            { key: 'label', label: t('marbleSizes.label'), render: (s) => <span dir="ltr" className="font-bold">{s.label}</span> },
            { key: 'length_in', label: t('marbleSizes.length'), align: 'right', render: (s) => fmtNum(s.length_in) },
            { key: 'width_in', label: t('marbleSizes.width'), align: 'right', render: (s) => fmtNum(s.width_in) },
            { key: 'unit', label: t('marbleSizes.unit'), render: (s) => <span className={`chip chip-static ${isUr ? 'font-urdu' : ''}`}>{s.unit === 'inch' ? (isUr ? 'انچ' : 'Inch') : isUr ? 'فٹ' : 'Feet'}</span> },
            { key: 'is_custom', label: t('marbleSizes.custom'), render: (s) => (s.is_custom ? '✓' : '—') },
            { key: 'notes', label: t('common.notes'), render: (s) => s.notes || '-' }
          ]}
          onEdit={openEdit}
          onDelete={(s) => setDel(s)}
          emptyTitle={t('common.noRecords')}
          emptyHint={t('common.noRecordsHint')}
          emptyActionLabel={t('marbleSizes.add')}
          onEmptyAction={openAdd}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((s) => (
            <div key={s.id} className="glass rounded-3xl shadow-glass p-4 flex flex-col items-center gap-2 text-center">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 grid place-items-center text-white shadow-lg">
                <Ruler className="h-6 w-6" />
              </div>
              <div className="font-extrabold text-slate-800" dir="ltr">{s.label}</div>
              <div className="text-xs text-slate-400 tabular-nums" dir="ltr">
                {fmtNum(s.length_in)} × {fmtNum(s.width_in)} {s.unit === 'inch' ? (isUr ? 'انچ' : 'in') : 'ft'}
              </div>
              <div className="flex gap-1.5 mt-1">
                <button type="button" onClick={() => openEdit(s)} className="h-10 w-10 grid place-items-center rounded-xl bg-sky-100 text-sky-600 active:scale-95">✎</button>
                <button type="button" onClick={() => setDel(s)} className="h-10 w-10 grid place-items-center rounded-xl bg-rose-100 text-rose-600 active:scale-95">×</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <ExportImportBar
          title={t('marbleSizes.title')}
          filenameBase="marble-sizes"
          importCfg={importCfg}
          columns={[
            { key: 'label', label: t('marbleSizes.label') },
            { key: 'length_in', label: t('marbleSizes.length'), align: 'right', get: (s) => fmtNum(s.length_in) },
            { key: 'width_in', label: t('marbleSizes.width'), align: 'right', get: (s) => fmtNum(s.width_in) },
            { key: 'unit', label: t('marbleSizes.unit'), get: (s) => (s.unit === 'inch' ? (isUr ? 'انچ' : 'inch') : isUr ? 'فٹ' : 'feet') },
            { key: 'is_custom', label: t('marbleSizes.custom'), get: (s) => (s.is_custom ? '✓' : '') },
            { key: 'notes', label: t('common.notes'), get: (s) => s.notes ?? '' }
          ]}
          rows={filtered as unknown as Record<string, unknown>[]}
        />
      </div>

      <Modal open={modal.open} onClose={() => setModal({ open: false })} title={modal.edit ? t('marbleSizes.edit') : t('marbleSizes.add')} dirty={Boolean(modal.edit)} onSave={save}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input label={t('marbleSizes.label')} value={label} onChange={setLabel} error={labelErr} icon={Ruler} placeholder="24x24 / پتی 4x24" dir="ltr" required />
          </div>
          <Input label={t('marbleSizes.length')} value={length} onChange={(v) => setLength(toLatinDigits(v))} inputMode="decimal" dir="ltr" className="tabular-nums" />
          <Input label={t('marbleSizes.width')} value={width} onChange={(v) => setWidth(toLatinDigits(v))} inputMode="decimal" dir="ltr" className="tabular-nums" />
          <Select label={t('marbleSizes.unit')} value={unit} onChange={setUnit} options={SIZE_UNITS.map((o) => ({ value: o.value, label: isUr ? o.ur : o.en }))} />
          <div className="sm:col-span-2">
            <Input label={t('common.notes')} value={notes} onChange={setNotes} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={Boolean(del)} title={t('common.confirmDeleteTitle')} message={t('marbleSizes.deleteConfirm')} confirmLabel={t('common.delete')} onConfirm={doDelete} onClose={() => setDel(null)} />
    </div>
  );
}
