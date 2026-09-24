import { useMemo, useState } from 'react';
import { Boxes, ImageIcon, TriangleAlert } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ExportImportBar from '../../components/ui/ExportImportBar';
import PhotoUpload from '../../components/ui/PhotoUpload';
import { useToast } from '../../components/ui/Toast';
import { useLang } from '../../i18n';
import { useStock } from '../../hooks/useStock';
import { useMarbleTypes } from '../../hooks/useMarbleTypes';
import { useMarbleSizes } from '../../hooks/useMarbleSizes';
import { useCustomColumns } from '../../hooks/useCustomColumns';
import type { StockItem } from '../../types';
import { fmtNum, num, toLatinDigits } from '../../utils/format';
import { parseNumCell, type ImportConfig } from '../../import/importExcel';

export default function StockPage() {
  const { t, isUr } = useLang();
  const toast = useToast();
  const { rows: stock, loading, insert, update, remove } = useStock();
  const { rows: marbleTypes } = useMarbleTypes();
  const { rows: marbleSizes } = useMarbleSizes();
  const { rows: customCols } = useCustomColumns('stock');

  const [q, setQ] = useState('');
  const [modal, setModal] = useState<{ open: boolean; edit?: StockItem }>({ open: false });
  const [del, setDel] = useState<StockItem | null>(null);

  const [typeId, setTypeId] = useState('');
  const [customType, setCustomType] = useState('');
  const [sizeId, setSizeId] = useState('');
  const [customSize, setCustomSize] = useState('');
  const [color, setColor] = useState('');
  const [quantity, setQuantity] = useState('');
  const [sqft, setSqft] = useState('');
  const [rate, setRate] = useState('');
  const [location, setLocation] = useState('');
  const [typeErr, setTypeErr] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [customVals, setCustomVals] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    const needle = toLatinDigits(q.trim().toLowerCase());
    if (!needle) return stock;
    return stock.filter(
      (s) =>
        (s.marble_type_name ?? '').toLowerCase().includes(needle) ||
        (s.size_label ?? '').toLowerCase().includes(needle) ||
        (s.location_note ?? '').toLowerCase().includes(needle)
    );
  }, [stock, q]);

  const selectedType = marbleTypes.find((m) => m.id === typeId);

  const openAdd = () => {
    setTypeId('');
    setCustomType('');
    setSizeId('');
    setCustomSize('');
    setColor('');
    setQuantity('');
    setSqft('');
    setRate('');
    setLocation('');
    setTypeErr('');
    setPhotos([]);
    setCustomVals({});
    setModal({ open: true });
  };

  const openEdit = (s: StockItem) => {
    setTypeId(s.marble_type_id ?? '');
    setCustomType(s.marble_type_id ? '' : s.marble_type_name ?? '');
    setSizeId(s.size_id ?? '');
    setCustomSize(s.size_id ? '' : s.size_label ?? '');
    setColor(s.color ?? '');
    setQuantity(String(num(s.quantity)));
    setSqft(String(num(s.square_feet)));
    setRate(String(num(s.rate_per_sqft)));
    setLocation(s.location_note ?? '');
    setTypeErr('');
    setPhotos(s.photo_urls ?? []);
    setCustomVals(s.custom_fields ?? {});
    setModal({ open: true, edit: s });
  };

  const save = async () => {
    const typeName = selectedType?.name_ur ?? customType.trim();
    if (!typeName) {
      setTypeErr(t('validation.required'));
      return;
    }
    const sizeLabel = marbleSizes.find((s) => s.id === sizeId)?.label ?? customSize.trim() ?? '';
    const values = {
      marble_type_id: selectedType?.id ?? null,
      marble_type_name: selectedType ? (isUr ? selectedType.name_ur : selectedType.name_en) : customType.trim(),
      size_id: sizeId || null,
      size_label: sizeLabel || null,
      color: color.trim() || selectedType?.color_name || null,
      quantity: num(quantity),
      square_feet: num(sqft),
      rate_per_sqft: num(rate),
      location_note: location.trim() || null,
      photo_urls: photos.length ? photos : null,
      custom_fields: Object.keys(customVals).length ? customVals : null,
      updated_at: new Date().toISOString()
    };
    try {
      if (modal.edit) await update(modal.edit.id, values);
      else await insert(values);
      toast.success(t('stock.saved'));
      setModal({ open: false });
    } catch {
      toast.error(navigator.onLine ? t('toast.error') : t('toast.offline'));
    }
  };

  const doDelete = async () => {
    if (!del) return;
    try {
      await remove(del.id);
      toast.success(t('stock.deleted'));
    } catch {
      toast.error(t('toast.error'));
    } finally {
      setDel(null);
    }
  };

  const importCfg: ImportConfig = {
    columns: [
      { key: 'type', labels: ['قسم', 'Type'] },
      { key: 'color', labels: ['رنگ', 'Color'] },
      { key: 'size', labels: ['سائز', 'Size'] },
      { key: 'qty', labels: ['تعداد', 'Quantity'] },
      { key: 'sqft', labels: ['فٹواری', 'Sq Feet'] },
      { key: 'rate', labels: ['ریٹ', 'Rate'] },
      { key: 'place', labels: ['جگہ', 'Location'] }
    ],
    example: { type: isUr ? 'سفید ماربل' : 'White Marble', color: 'سفید', size: '24x24', qty: 25, sqft: 600, rate: 220, place: isUr ? 'گودام 1' : 'Store 1' },
    mapRow: (raw) => {
      if (!raw.type) return { error: t('validation.nameEmpty') };
      const qty = parseNumCell(raw.qty);
      if (qty == null) return { error: t('validation.numberInvalid') };
      return {
        row: {
          _name: raw.type,
          _size: raw.size,
          color: raw.color || null,
          quantity: qty,
          square_feet: parseNumCell(raw.sqft) ?? 0,
          rate_per_sqft: parseNumCell(raw.rate) ?? 0,
          location_note: raw.place || null,
          updated_at: new Date().toISOString()
        }
      };
    },
    findDuplicate: (existing, mapped) =>
      (existing as StockItem[]).find(
        (s) => (s.marble_type_name ?? '') === mapped._name && (s.size_label ?? '') === (mapped._size || '') && num(s.rate_per_sqft) === num(mapped.rate_per_sqft)
      ),
    insertRows: async (rows) => {
      // resolve or create marble types & sizes by name, then insert stock rows
      for (const r of rows) {
        const { _name, _size, ...vals } = r as { _name: string; _size: string } & Record<string, unknown>;
        let typeId: string | null = null;
        let typeColor: string | null = (vals.color as string) ?? null;
        const mt = marbleTypes.find((m) => m.name_ur === _name || m.name_en.toLowerCase() === _name.toLowerCase());
        if (mt) {
          typeId = mt.id;
          typeColor = typeColor ?? mt.color_name;
        } else {
          const { data, error } = await (await import('../../lib/supabaseClient')).supabase
            .from('marble_types')
            .insert({ name_ur: _name, name_en: _name, color_name: (vals.color as string) ?? null, color_hex: '#94a3b8', cuts: [] })
            .select()
            .single();
          if (!error) typeId = data.id;
        }
        let sizeId: string | null = null;
        if (_size) {
          const ms = marbleSizes.find((s) => s.label.toLowerCase() === _size.toLowerCase());
          if (ms) sizeId = ms.id;
          else {
            const { data, error } = await (await import('../../lib/supabaseClient')).supabase
              .from('marble_sizes')
              .insert({ label: _size, unit: 'inch', is_custom: true })
              .select()
              .single();
            if (!error) sizeId = data.id;
          }
        }
        await insert({ ...vals, color: typeColor, marble_type_id: typeId, marble_type_name: _name, size_id: sizeId, size_label: _size || null });
      }
    },
    updateRow: async (existing, mapped) => {
      const { _name: _n, _size: _s, ...vals } = mapped as Record<string, unknown>;
      await update((existing as StockItem).id, vals);
    }
  };

  const liveValue = num(sqft) * num(rate);

  return (
    <div>
      <PageHeader title={t('stock.title')} count={filtered.length} addLabel={t('stock.add')} onAdd={openAdd} search={{ value: q, onChange: setQ }} />

      <DataTable
        loading={loading}
        rows={filtered}
        rowClass={(s) => (num(s.quantity) < 10 ? '!bg-amber-50' : '')}
        columns={[
          {
            key: 'photo',
            label: t('photos.title'),
            render: (s) =>
              s.photo_urls && s.photo_urls.length > 0 ? (
                <img src={s.photo_urls[0]} alt="" className="h-11 w-11 rounded-xl object-cover border-2 border-teal-200" />
              ) : (
                <span className="h-11 w-11 grid place-items-center rounded-xl bg-stone-100 text-stone-300">
                  <ImageIcon className="h-5 w-5" />
                </span>
              )
          },
          {
            key: 'type',
            label: t('stock.stockType'),
            render: (s) => (
              <span className="flex items-center gap-2 font-bold">
                <span className="h-3.5 w-3.5 rounded-full inline-block border border-stone-300" style={{ background: s.color ?? '#94a3b8' }} />
                <span className={isUr ? 'font-urdu' : ''}>{s.marble_type_name || '—'}</span>
              </span>
            )
          },
          { key: 'color', label: t('stock.color'), render: (s) => <span className={isUr ? 'font-urdu' : ''}>{s.color || '—'}</span> },
          { key: 'size_label', label: t('stock.size'), render: (s) => <span dir="ltr">{s.size_label || '—'}</span> },
          {
            key: 'quantity',
            label: t('common.quantity'),
            align: 'right',
            render: (s) => (
              <span className={`font-extrabold ${num(s.quantity) < 10 ? 'text-amber-600' : ''}`}>
                {fmtNum(s.quantity)}
                {num(s.quantity) < 10 && (
                  <span className="chip chip-warn !text-[10px] ms-1.5 gap-1">
                    <TriangleAlert className="h-3 w-3" />
                    <span className={isUr ? 'font-urdu' : ''}>{t('stock.lowStock')}</span>
                  </span>
                )}
              </span>
            )
          },
          { key: 'square_feet', label: t('stock.sqft'), align: 'right', render: (s) => fmtNum(s.square_feet) },
          { key: 'rate_per_sqft', label: t('stock.ratePerSqft'), align: 'right', render: (s) => fmtNum(s.rate_per_sqft) },
          ...customCols.map((c) => ({
            key: `custom_${c.key}`,
            label: isUr ? c.label_ur : c.label_en,
            render: (s: StockItem) => <span className={isUr ? 'font-urdu' : ''}>{s.custom_fields?.[c.key] || '—'}</span>
          }))
        ]}
        onEdit={openEdit}
        onDelete={(s) => setDel(s)}
        emptyTitle={t('stock.noStock')}
        emptyHint={t('common.noRecordsHint')}
        emptyActionLabel={t('stock.add')}
        onEmptyAction={openAdd}
      />

      <div className="mt-4">
        <ExportImportBar
          title={t('stock.title')}
          filenameBase="stock"
          importCfg={importCfg}
          columns={[
            { key: 'marble_type_name', label: t('stock.stockType'), get: (s) => s.marble_type_name ?? '' },
            { key: 'color', label: t('stock.color'), get: (s) => s.color ?? '' },
            { key: 'size_label', label: t('stock.size'), get: (s) => s.size_label ?? '' },
            { key: 'quantity', label: t('common.quantity'), align: 'right', get: (s) => fmtNum(s.quantity) },
            { key: 'square_feet', label: t('stock.sqft'), align: 'right', get: (s) => fmtNum(s.square_feet) },
            { key: 'rate_per_sqft', label: t('stock.ratePerSqft'), align: 'right', get: (s) => fmtNum(s.rate_per_sqft) },
            { key: 'location_note', label: t('stock.location'), get: (s) => s.location_note ?? '' }
          ]}
          rows={filtered as unknown as Record<string, unknown>[]}
          summary={[{ label: t('common.total'), value: fmtNum(filtered.reduce((s, x) => s + num(x.square_feet) * num(x.rate_per_sqft), 0)) }]}
        />
      </div>

      <Modal open={modal.open} onClose={() => setModal({ open: false })} title={modal.edit ? t('stock.edit') : t('stock.add')} dirty={Boolean(modal.edit)} onSave={save}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label={t('stock.stockType')}
            value={typeId}
            onChange={(v) => {
              setTypeId(v);
              if (v) setCustomType('');
            }}
            allowCustom
            options={marbleTypes.map((m) => ({ value: m.id, label: isUr ? m.name_ur : m.name_en }))}
          />
          {!typeId && (
            <Input label={t('common.otherTypeYourOwn')} value={customType} onChange={setCustomType} error={typeErr} />
          )}
          <Select
            label={t('stock.size')}
            value={sizeId}
            onChange={(v) => {
              setSizeId(v);
              if (v) setCustomSize('');
            }}
            allowCustom
            options={marbleSizes.map((s) => ({ value: s.id, label: s.label }))}
          />
          {!sizeId && <Input label={t('common.otherTypeYourOwn')} value={customSize} onChange={setCustomSize} dir="ltr" />}
          <Input label={t('stock.color')} value={color} onChange={setColor} />
          <Input label={t('common.quantity')} value={quantity} onChange={(v) => setQuantity(toLatinDigits(v))} inputMode="decimal" dir="ltr" className="tabular-nums" />
          <Input label={t('stock.sqft')} value={sqft} onChange={(v) => setSqft(toLatinDigits(v))} inputMode="decimal" dir="ltr" className="tabular-nums" />
          <Input label={t('stock.ratePerSqft')} value={rate} onChange={(v) => setRate(toLatinDigits(v))} inputMode="decimal" dir="ltr" className="tabular-nums" />
          <div className="sm:col-span-2">
            <Input label={t('stock.locationNote')} value={location} onChange={setLocation} icon={Boxes} />
          </div>
          {/* live total value = فٹواری × ریٹ */}
          <div className="sm:col-span-2 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-5 py-4 flex items-center justify-between font-extrabold">
            <span className={isUr ? 'font-urdu u-text' : ''}>{t('stock.totalValue')}:</span>
            <span className="text-2xl tabular-nums" dir="ltr">{fmtNum(liveValue)}</span>
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

        {/* photos — kept below the main fields so the person scrolls to see them */}
        <div className="mt-6 pt-6 border-t border-stone-100">
          <PhotoUpload urls={photos} onChange={setPhotos} folder="stock" />
        </div>
      </Modal>

      <ConfirmDialog open={Boolean(del)} title={t('common.confirmDeleteTitle')} message={t('stock.deleteConfirm')} confirmLabel={t('common.delete')} onConfirm={doDelete} onClose={() => setDel(null)} />
    </div>
  );
}
