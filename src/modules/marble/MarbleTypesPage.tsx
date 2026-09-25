import { useMemo, useState } from 'react';
import { ImagePlus, Shapes } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ExportImportBar from '../../components/ui/ExportImportBar';
import PhotoUpload from '../../components/ui/PhotoUpload';
import { useToast } from '../../components/ui/Toast';
import { useLang } from '../../i18n';
import { useMarbleTypes } from '../../hooks/useMarbleTypes';
import { useCustomColumns } from '../../hooks/useCustomColumns';
import { MARBLE_CUTS, type MarbleType } from '../../types';
import { toLatinDigits } from '../../utils/format';
import type { ImportConfig } from '../../import/importExcel';

export default function MarbleTypesPage() {
  const { t, lang, isUr } = useLang();
  const toast = useToast();
  const { rows: types, loading, insert, update, remove } = useMarbleTypes();
  const { rows: customCols } = useCustomColumns('marble_types');

  const [q, setQ] = useState('');
  const [modal, setModal] = useState<{ open: boolean; edit?: MarbleType }>({ open: false });
  const [del, setDel] = useState<MarbleType | null>(null);

  const [nameUr, setNameUr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [colorName, setColorName] = useState('');
  const [colorHex, setColorHex] = useState('#94a3b8');
  const [cuts, setCuts] = useState<string[]>([]);
  const [customCut, setCustomCut] = useState('');
  const [notes, setNotes] = useState('');
  const [nameErr, setNameErr] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [customVals, setCustomVals] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    const needle = toLatinDigits(q.trim().toLowerCase());
    if (!needle) return types;
    return types.filter(
      (m) =>
        m.name_ur.includes(needle) ||
        m.name_en.toLowerCase().includes(needle) ||
        (m.color_name ?? '').includes(needle)
    );
  }, [types, q]);

  const openAdd = () => {
    setNameUr('');
    setNameEn('');
    setColorName('');
    setColorHex('#94a3b8');
    setCuts([]);
    setCustomCut('');
    setNotes('');
    setNameErr('');
    setPhotos([]);
    setCustomVals({});
    setModal({ open: true });
  };

  const openEdit = (m: MarbleType) => {
    setNameUr(m.name_ur);
    setNameEn(m.name_en);
    setColorName(m.color_name ?? '');
    setColorHex(m.color_hex ?? '#94a3b8');
    setCuts(m.cuts ?? []);
    setCustomCut('');
    setNotes(m.notes ?? '');
    setNameErr('');
    setPhotos(m.photo_urls ?? []);
    setCustomVals(m.custom_fields ?? {});
    setModal({ open: true, edit: m });
  };

  const toggleCut = (value: string) => {
    setCuts((cs) => (cs.includes(value) ? cs.filter((c) => c !== value) : [...cs, value]));
  };

  const save = async () => {
    if (!nameUr.trim() && !nameEn.trim()) {
      setNameErr(t('validation.nameEmpty'));
      return;
    }
    const allCuts = customCut.trim() ? [...cuts, customCut.trim()] : cuts;
    const values = {
      name_ur: nameUr.trim() || nameEn.trim(),
      name_en: nameEn.trim() || nameUr.trim(),
      color_name: colorName.trim() || null,
      color_hex: colorHex,
      cuts: allCuts,
      notes: notes.trim() || null,
      photo_urls: photos.length ? photos : null,
      custom_fields: Object.keys(customVals).length ? customVals : null
    };
    try {
      if (modal.edit) await update(modal.edit.id, values);
      else await insert(values);
      toast.success(t('marbleTypes.saved'));
      setModal({ open: false });
    } catch {
      toast.error(navigator.onLine ? t('toast.error') : t('toast.offline'));
    }
  };

  const doDelete = async () => {
    if (!del) return;
    try {
      await remove(del.id);
      toast.success(t('marbleTypes.deleted'));
    } catch {
      toast.error(t('toast.error'));
    } finally {
      setDel(null);
    }
  };

  const importCfg: ImportConfig = {
    columns: [
      { key: 'nameUr', labels: ['نام (اردو)', 'Name (Urdu)'] },
      { key: 'nameEn', labels: ['نام (انگریزی)', 'Name (English)'] },
      { key: 'colorName', labels: ['رنگ', 'Color'] },
      { key: 'colorHex', labels: ['رنگ کوڈ', 'Color Code'] },
      { key: 'cuts', labels: ['کٹنگ', 'Cuts'] },
      { key: 'note', labels: ['نوٹ', 'Note'] }
    ],
    example: { nameUr: 'سبز ماربل', nameEn: 'Green Marble', colorName: 'سبز', colorHex: '#0e9f6e', cuts: 'سلیب، ٹائل', note: '' },
    mapRow: (raw) => {
      if (!raw.nameUr && !raw.nameEn) return { error: t('validation.nameEmpty') };
      const cutList = raw.cuts
        .split(/[،,;/]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      return {
        row: {
          name_ur: raw.nameUr || raw.nameEn,
          name_en: raw.nameEn || raw.nameUr,
          color_name: raw.colorName || null,
          color_hex: /^#[0-9a-fA-F]{3,8}$/.test(raw.colorHex.trim()) ? raw.colorHex.trim() : '#94a3b8',
          cuts: cutList,
          notes: raw.note || null
        }
      };
    },
    findDuplicate: (existing, mapped) => (existing as MarbleType[]).find((m) => m.name_en.toLowerCase() === String(mapped.name_en).toLowerCase()),
    insertRows: async (rows) => {
      await insert(rows);
    },
    updateRow: async (existing, mapped) => {
      await update((existing as MarbleType).id, mapped);
    }
  };

  return (
    <div>
      <PageHeader title={t('marbleTypes.title')} count={filtered.length} addLabel={t('marbleTypes.add')} onAdd={openAdd} search={{ value: q, onChange: setQ }} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading && Array.from({ length: 6 }).map((_, i) => <div key={i} className="glass rounded-3xl h-44 animate-pulse" />)}
        {!loading && filtered.length === 0 && (
          <div className="glass rounded-3xl p-10 text-center sm:col-span-2 xl:col-span-3">
            <p className={`text-stone-500 font-bold ${isUr ? 'font-urdu u-text' : ''}`}>{t('marbleTypes.noTypes')}</p>
            <Button variant="primary" className="mt-4 mx-auto" onClick={openAdd}>{t('marbleTypes.add')}</Button>
          </div>
        )}
        {filtered.map((m) => (
          <div key={m.id} className="glass rounded-3xl shadow-glass p-5 flex flex-col gap-3">
            <div className="flex items-center gap-4">
              {m.photo_urls && m.photo_urls.length > 0 ? (
                <img
                  src={m.photo_urls[0]}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-3xl border-4 border-white shadow-lg object-cover"
                />
              ) : (
                <div
                  className="h-16 w-16 shrink-0 rounded-3xl border-4 border-white shadow-lg"
                  style={{ background: m.color_hex ?? '#94a3b8' }}
                  title={m.color_name ?? ''}
                />
              )}
              <div className="min-w-0">
                <div className="font-urdu u-text text-xl font-bold text-stone-900 truncate">{m.name_ur}</div>
                <div className="text-sm font-bold text-emerald-600 truncate" dir="ltr">{m.name_en}</div>
                {m.color_name && <div className={`text-xs text-stone-400 ${isUr ? 'font-urdu' : ''}`}>{m.color_name}</div>}
              </div>
            </div>
            {(m.cuts ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(m.cuts ?? []).map((c) => (
                  <span key={c} className={`chip chip-static !text-[11px] ${isUr ? 'font-urdu' : ''}`}>{c}</span>
                ))}
              </div>
            )}
            {m.notes && <p className={`text-xs text-stone-500 ${isUr ? 'font-urdu u-text' : ''}`}>{m.notes}</p>}
            {customCols.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {customCols.map((c) => (
                  <span key={c.id} className={`chip chip-static !text-[11px] ${isUr ? 'font-urdu' : ''}`}>
                    {isUr ? c.label_ur : c.label_en}: {m.custom_fields?.[c.key] || '—'}
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-auto pt-1">
              <Button size="sm" variant="info" onClick={() => openEdit(m)}>{t('common.edit')}</Button>
              <Button size="sm" variant="danger" onClick={() => setDel(m)}>{t('common.delete')}</Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <ExportImportBar
          title={t('marbleTypes.title')}
          filenameBase="marble-types"
          importCfg={importCfg}
          columns={[
            { key: 'name_ur', label: t('marbleTypes.nameUr') },
            { key: 'name_en', label: t('marbleTypes.nameEn') },
            { key: 'color_name', label: t('common.color'), get: (m) => m.color_name ?? '' },
            { key: 'color_hex', label: t('marbleTypes.colorHex'), get: (m) => m.color_hex ?? '' },
            { key: 'cuts', label: t('marbleTypes.cuts'), get: (m) => (m.cuts ?? []).join('، ') },
            { key: 'notes', label: t('common.notes'), get: (m) => m.notes ?? '' }
          ]}
          rows={filtered as unknown as Record<string, unknown>[]}
        />
      </div>

      <Modal open={modal.open} onClose={() => setModal({ open: false })} title={modal.edit ? t('marbleTypes.edit') : t('marbleTypes.add')} dirty={Boolean(modal.edit)} onSave={save}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label={t('marbleTypes.nameUr')} value={nameUr} onChange={setNameUr} error={nameErr} />
          <Input label={t('marbleTypes.nameEn')} value={nameEn} onChange={setNameEn} dir="ltr" />
          <Input label={t('marbleTypes.colorName')} value={colorName} onChange={setColorName} />
          <div className="flex items-end gap-3">
            <label className="shrink-0">
              <span className="sr-only">color</span>
              <input
                type="color"
                value={colorHex}
                onChange={(e) => setColorHex(e.target.value)}
                className="h-12 w-14 rounded-2xl border-2 border-stone-200 cursor-pointer bg-white p-1"
              />
            </label>
            <div className="flex-1">
              <Input label={t('marbleTypes.colorHex')} value={colorHex} onChange={setColorHex} dir="ltr" className="tabular-nums" />
            </div>
          </div>

          {/* cuts multi-select chips + custom */}
          <div className="sm:col-span-2">
            <div className={`text-sm font-semibold text-stone-700 mb-1.5 ${isUr ? 'font-urdu u-text' : ''}`}>{t('marbleTypes.cuts')}</div>
            <p className={`text-xs text-stone-400 mb-2 ${isUr ? 'font-urdu' : ''}`}>{t('marbleTypes.cutsHint')}</p>
            <div className="flex flex-wrap gap-2">
              {MARBLE_CUTS.map((c) => (
                <button key={c.value} type="button" onClick={() => toggleCut(c.value)} className={`chip ${cuts.includes(c.value) ? 'chip-active' : ''}`}>
                  <span className={isUr ? 'font-urdu' : ''}>{isUr ? c.ur : c.en}</span>
                </button>
              ))}
              {cuts
                .filter((c) => !MARBLE_CUTS.some((mc) => mc.value === c))
                .map((c) => (
                  <button key={c} type="button" onClick={() => toggleCut(c)} className="chip chip-active">
                    <span className={isUr ? 'font-urdu' : ''}>{c}</span>
                  </button>
                ))}
            </div>
            <div className="mt-3">
              <Input
                label={t('common.otherTypeYourOwn')}
                value={customCut}
                onChange={setCustomCut}
                placeholder={isUr ? 'مثلاً: پٹی سلپ' : 'e.g. Custom cut'}
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <Input label={t('common.notes')} value={notes} onChange={setNotes} />
          </div>
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
          <PhotoUpload urls={photos} onChange={setPhotos} folder="marble-types" />
        </div>
      </Modal>

      <ConfirmDialog open={Boolean(del)} title={t('common.confirmDeleteTitle')} message={t('marbleTypes.deleteConfirm')} confirmLabel={t('common.delete')} onConfirm={doDelete} onClose={() => setDel(null)} />
    </div>
  );
}
