import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Users } from 'lucide-react';
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
import { useCustomers } from '../../hooks/useCustomers';
import { useLedger, computeBalances } from '../../hooks/useLedger';
import { useCustomColumns } from '../../hooks/useCustomColumns';
import { CUSTOMER_TYPES, optLabel, type Customer } from '../../types';
import { fmtNum, num, toLatinDigits } from '../../utils/format';
import { parseNumCell, type ImportConfig } from '../../import/importExcel';

type Tab = 'all' | 'customer' | 'supplier';

export default function CustomersPage() {
  const { t, lang, isUr } = useLang();
  const toast = useToast();
  const navigate = useNavigate();
  const { rows: customers, loading, insert, update, remove } = useCustomers();
  const { rows: ledger, insert: insertEntry } = useLedger();
  const { rows: customCols } = useCustomColumns('customers');

  const [tab, setTab] = useState<Tab>('all');
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<{ open: boolean; edit?: Customer }>({ open: false });
  const [del, setDel] = useState<Customer | null>(null);

  // form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState('customer');
  const [opening, setOpening] = useState('');
  const [notes, setNotes] = useState('');
  const [nameErr, setNameErr] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [customVals, setCustomVals] = useState<Record<string, string>>({});

  const balances = useMemo(() => computeBalances(customers, ledger), [customers, ledger]);

  const filtered = useMemo(() => {
    const needle = toLatinDigits(q.trim().toLowerCase());
    return customers.filter((c) => {
      if (tab !== 'all' && c.type !== tab && c.type !== 'both') return false;
      if (!needle) return true;
      return (
        c.name.toLowerCase().includes(needle) ||
        (c.phone ?? '').includes(needle) ||
        (c.address_note ?? '').toLowerCase().includes(needle)
      );
    });
  }, [customers, tab, q]);

  const openAdd = () => {
    setName('');
    setPhone('');
    setAddress('');
    setType('customer');
    setOpening('');
    setNotes('');
    setNameErr('');
    setPhotos([]);
    setCustomVals({});
    setModal({ open: true });
  };

  const openEdit = (c: Customer) => {
    setName(c.name);
    setPhone(c.phone ?? '');
    setAddress(c.address_note ?? '');
    setType(c.type);
    setOpening(c.opening_balance != null ? String(c.opening_balance) : '');
    setNotes(c.notes ?? '');
    setNameErr('');
    setPhotos(c.photo_urls ?? []);
    setCustomVals(c.custom_fields ?? {});
    setModal({ open: true, edit: c });
  };

  const dirty = modal.open && Boolean(modal.edit);

  const save = async () => {
    if (!name.trim()) {
      setNameErr(t('validation.nameEmpty'));
      return;
    }
    const values = {
      name: name.trim(),
      phone: phone.trim() || null,
      address_note: address.trim() || null,
      type,
      opening_balance: num(opening),
      notes: notes.trim() || null,
      photo_urls: photos.length ? photos : null,
      custom_fields: Object.keys(customVals).length ? customVals : null
    };
    try {
      if (modal.edit) {
        await update(modal.edit.id, values);
      } else {
        await insert(values);
      }
      toast.success(t('customers.saved'));
      setModal({ open: false });
    } catch {
      toast.error(navigator.onLine ? t('toast.error') : t('toast.offline'));
    }
  };

  const doDelete = async () => {
    if (!del) return;
    try {
      await remove(del.id);
      toast.success(t('customers.deleted'));
    } catch {
      toast.error(t('toast.error'));
    } finally {
      setDel(null);
    }
  };

  // ── import config (template: نام | فون | قسم | پتہ/نوٹ | ابتدائی بیلنس) ──
  const importCfg: ImportConfig = {
    columns: [
      { key: 'name', labels: ['نام', 'Name'] },
      { key: 'phone', labels: ['فون', 'Phone'] },
      { key: 'type', labels: ['قسم', 'Type'] },
      { key: 'note', labels: ['پتہ / نوٹ', 'Address / Note'] },
      { key: 'opening', labels: ['ابتدائی بیلنس', 'Opening Balance'] }
    ],
    example: { name: isUr ? 'احمد خان' : 'Ahmad Khan', phone: '0300-1234567', type: isUr ? 'گاہک' : 'customer', note: isUr ? 'نواب روڈ' : 'Nawab Road', opening: 0 },
    mapRow: (raw) => {
      if (!raw.name) return { error: t('validation.nameEmpty') };
      let typeVal = 'customer';
      const tv = raw.type.trim().toLowerCase();
      if (tv.includes('سپلائر') || tv.includes('supplier')) typeVal = 'supplier';
      else if (tv.includes('دونوں') || tv.includes('both')) typeVal = 'both';
      else if (tv.includes('گاہک') || tv.includes('customer')) typeVal = 'customer';
      const opening = parseNumCell(raw.opening);
      return {
        row: {
          name: raw.name,
          phone: raw.phone || null,
          address_note: raw.note || null,
          type: typeVal,
          opening_balance: opening ?? 0,
          notes: null
        }
      };
    },
    findDuplicate: (existing, mapped) =>
      (existing as Customer[]).find(
        (c) => c.name.trim().toLowerCase() === String(mapped.name).trim().toLowerCase() && (c.phone ?? '') === (mapped.phone ?? '')
      ),
    insertRows: async (rows) => {
      await insert(rows);
    },
    updateRow: async (existing, mapped) => {
      await update((existing as Customer).id, mapped);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'customer', label: t('customers.tabCustomers') },
    { key: 'supplier', label: t('customers.tabSuppliers') },
    { key: 'all', label: t('customers.tabAll') }
  ];

  return (
    <div>
      <PageHeader title={t('customers.title')} count={filtered.length} addLabel={t('customers.add')} onAdd={openAdd} search={{ value: q, onChange: setQ }}>
        {tabs.map((x) => (
          <button key={x.key} type="button" onClick={() => setTab(x.key)} className={`chip ${tab === x.key ? 'chip-active' : ''}`}>
            <span className={isUr ? 'font-urdu' : ''}>{x.label}</span>
          </button>
        ))}
      </PageHeader>

      <DataTable
        loading={loading}
        rows={filtered}
        columns={[
          {
            key: 'photo',
            label: t('photos.title'),
            render: (c) =>
              c.photo_urls && c.photo_urls.length > 0 ? (
                <img src={c.photo_urls[0]} alt="" className="h-11 w-11 rounded-xl object-cover border-2 border-teal-200" />
              ) : (
                <span className="h-11 w-11 grid place-items-center rounded-xl bg-stone-100 text-stone-300">
                  <Users className="h-5 w-5" />
                </span>
              )
          },
          { key: 'name', label: t('common.name') },
          {
            key: 'phone',
            label: t('common.phone'),
            render: (c) => <span dir="ltr" className="tabular-nums">{c.phone || '-'}</span>
          },
          {
            key: 'type',
            label: t('common.type'),
            render: (c) => <span className={`chip chip-static ${isUr ? 'font-urdu' : ''}`}>{optLabel(CUSTOMER_TYPES, c.type, lang, c.type)}</span>
          },
          {
            key: 'lena',
            label: t('customers.totalLena'),
            align: 'right',
            render: (c) => {
              const b = balances.get(c.id)?.balance ?? 0;
              return <span className="text-emerald-700 font-bold">{fmtNum(Math.max(b, 0))}</span>;
            }
          },
          {
            key: 'dena',
            label: t('customers.totalDena'),
            align: 'right',
            render: (c) => {
              const b = balances.get(c.id)?.balance ?? 0;
              return <span className="text-rose-700 font-bold">{fmtNum(Math.max(-b, 0))}</span>;
            }
          },
          {
            key: 'balance',
            label: t('customers.balance'),
            align: 'right',
            render: (c) => {
              const b = balances.get(c.id)?.balance ?? 0;
              return (
                <span className={`font-extrabold ${b > 0 ? 'text-emerald-700' : b < 0 ? 'text-rose-700' : 'text-stone-500'}`}>
                  {b >= 0 ? '+' : '-'}{fmtNum(Math.abs(b))}
                </span>
              );
            }
          },
          ...customCols.map((cc) => ({
            key: `custom_${cc.key}`,
            label: isUr ? cc.label_ur : cc.label_en,
            render: (c: Customer) => <span className={isUr ? 'font-urdu' : ''}>{c.custom_fields?.[cc.key] || '—'}</span>
          }))
        ]}
        extraActions={(c) => (
          <button
            type="button"
            title={t('customers.viewLedger')}
            onClick={() => navigate(`/customer/${c.id}`)}
            className="h-11 w-11 grid place-items-center rounded-xl bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition active:scale-95"
          >
            <BookOpen className="h-4.5 w-4.5" />
          </button>
        )}
        onEdit={openEdit}
        onDelete={(c) => setDel(c)}
        emptyTitle={t('common.noRecords')}
        emptyHint={t('common.noRecordsHint')}
        emptyActionLabel={t('customers.add')}
        onEmptyAction={openAdd}
      />

      <div className="mt-4">
        <ExportImportBar
          title={t('customers.title')}
          filenameBase="customers"
          importCfg={importCfg}
          columns={[
            { key: 'name', label: t('common.name') },
            { key: 'phone', label: t('common.phone'), get: (c) => (c.phone ?? '') },
            { key: 'type', label: t('common.type'), get: (c) => optLabel(CUSTOMER_TYPES, c.type, lang) },
            { key: 'address_note', label: t('common.address'), get: (c) => c.address_note ?? '' },
            { key: 'opening_balance', label: t('customers.openingBalance'), align: 'right', get: (c) => fmtNum(c.opening_balance) },
            {
              key: 'balance',
              label: t('customers.balance'),
              align: 'right',
              get: (c) => fmtNum(balances.get(c.id)?.balance ?? 0)
            }
          ]}
          rows={filtered as unknown as Record<string, unknown>[]}
        />
      </div>

      {/* add / edit modal */}
      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false })}
        title={modal.edit ? t('customers.edit') : t('customers.add')}
        dirty={dirty}
        onSave={save}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input label={t('common.name')} value={name} onChange={setName} error={nameErr} icon={Users} required />
          </div>
          <Input label={t('common.phone')} value={phone} onChange={(v) => setPhone(toLatinDigits(v))} type="tel" dir="ltr" placeholder={t('customers.phonePh')} />
          <Select
            label={t('common.type')}
            value={type}
            onChange={setType}
            options={CUSTOMER_TYPES.map((o) => ({ value: o.value, label: isUr ? o.ur : o.en }))}
          />
          <Input label={t('customers.addressNote')} value={address} onChange={setAddress} />
          <Input
            label={t('customers.openingBalance')}
            value={opening}
            onChange={(v) => setOpening(toLatinDigits(v))}
            type="text"
            inputMode="decimal"
            dir="ltr"
            className="tabular-nums"
          />
          <div className="sm:col-span-2">
            <Input label={t('common.notes')} value={notes} onChange={setNotes} />
          </div>
          {customCols.map((cc) => (
            <Input
              key={cc.id}
              label={isUr ? cc.label_ur : cc.label_en}
              value={customVals[cc.key] ?? ''}
              onChange={(v) => setCustomVals((prev) => ({ ...prev, [cc.key]: v }))}
            />
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-stone-100">
          <PhotoUpload urls={photos} onChange={setPhotos} folder="customers" />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(del)}
        title={t('common.confirmDeleteTitle')}
        message={t('customers.deleteConfirm')}
        confirmLabel={t('common.delete')}
        onConfirm={doDelete}
        onClose={() => setDel(null)}
      />
    </div>
  );
}
