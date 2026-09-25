import { useEffect, useState } from 'react';
import { Columns3, Download, MoonStar, Plus, Save, Settings as SettingsIcon, Smartphone, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { useLang } from '../../i18n';
import { useAppStore } from '../../store/useAppStore';
import { useCustomColumns } from '../../hooks/useCustomColumns';
import { supabase } from '../../lib/supabaseClient';
import { toLatinDigits, todayStr } from '../../utils/format';
import type { Lang, RateMode, CustomColumn } from '../../types';

// tables that support photos + manually-added extra columns
const COLUMN_TABLES = [
  'stock',
  'customers',
  'labour',
  'machinery',
  'expenses',
  'marble_types',
  'marble_sizes',
  'invoices'
] as const;

const TABLES = [
  'customers',
  'invoices',
  'invoice_items',
  'ledger_entries',
  'labour',
  'attendance',
  'wage_payments',
  'machinery',
  'machinery_maintenance',
  'marble_types',
  'marble_sizes',
  'stock',
  'expenses',
  'app_settings',
  'custom_columns'
];

const TABLE_KEY: Record<string, string> = {
  stock: 'stock',
  customers: 'customers',
  labour: 'labour',
  machinery: 'machinery',
  expenses: 'expenses',
  marble_types: 'marbleTypes',
  marble_sizes: 'marbleSizes',
  invoices: 'invoices'
};

declare global {
  interface Window {
    __pwaInstallPrompt?: (Event & { prompt: () => Promise<void> }) | null;
  }
}

export default function SettingsPage() {
  const { t, isUr } = useLang();
  const toast = useToast();
  const store = useAppStore();

  const [prefix, setPrefix] = useState(store.invoicePrefix);
  const [nextNo, setNextNo] = useState(String(store.nextInvoiceNo));
  const [installable, setInstallable] = useState(Boolean(window.__pwaInstallPrompt));

  // ── custom (manually-added) columns ──
  const [colTable, setColTable] = useState<string>('stock');
  const { rows: customCols, insert: insertCol, remove: removeCol } = useCustomColumns(colTable);
  const [newColUr, setNewColUr] = useState('');
  const [newColEn, setNewColEn] = useState('');
  const [delCol, setDelCol] = useState<CustomColumn | null>(null);

  const addColumn = async () => {
    if (!newColUr.trim() && !newColEn.trim()) return;
    try {
      const key = `c_${Date.now().toString(36)}`;
      await insertCol({
        table_name: colTable,
        key,
        label_ur: newColUr.trim() || newColEn.trim(),
        label_en: newColEn.trim() || newColUr.trim(),
        sort_order: customCols.length
      });
      setNewColUr('');
      setNewColEn('');
      toast.success(t('settings.columnAdded'));
    } catch {
      toast.error(navigator.onLine ? t('toast.error') : t('toast.offline'));
    }
  };

  const doDeleteColumn = async () => {
    if (!delCol) return;
    try {
      await removeCol(delCol.id);
      toast.success(t('settings.columnDeleted'));
    } catch {
      toast.error(t('toast.error'));
    } finally {
      setDelCol(null);
    }
  };

  // load server-side app_settings once and apply to local UI state
  useEffect(() => {
    supabase
      .from('app_settings')
      .select('*')
      .eq('id', 'app')
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          store.setLang((data.lang === 'en' ? 'en' : 'ur') as Lang);
          if (data.default_rate_mode === 'sqft' || data.default_rate_mode === 'qty') store.setRateMode(data.default_rate_mode as RateMode);
          store.setShowBubbles(data.showBubbles !== false);
          if (data.invoice_prefix) store.setInvoicePrefix(data.invoice_prefix);
          if (data.next_invoice_no) store.setNextInvoiceNo(data.next_invoice_no);
          setPrefix(data.invoice_prefix ?? 'AF');
          setNextNo(String(data.next_invoice_no ?? 1));
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = () => setInstallable(Boolean(window.__pwaInstallPrompt));
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const saveSettings = async () => {
    try {
      const values = {
        id: 'app',
        lang: store.lang,
        theme: store.theme,
        default_rate_mode: store.rateMode,
        invoice_prefix: prefix.trim() || 'AF',
        next_invoice_no: Math.max(1, Math.floor(Number(nextNo) || 1)),
        show_bubbles: store.showBubbles,
        currency_label: 'روپے'
      };
      await supabase.from('app_settings').upsert(values);
      store.setInvoicePrefix(values.invoice_prefix);
      store.setNextInvoiceNo(values.next_invoice_no);
      toast.success(t('settings.saved'));
    } catch {
      toast.error(navigator.onLine ? t('toast.error') : t('toast.offline'));
    }
  };

  const downloadBackup = async () => {
    try {
      const backup: Record<string, unknown[]> = {};
      for (const table of TABLES) {
        const { data } = await supabase.from(table).select('*');
        backup[table] = data ?? [];
      }
      const blob = new Blob([JSON.stringify({ factory: 'NEW ALMAKKA FACTORY', exported_at: new Date().toISOString(), data: backup }, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `almakka-backup-${todayStr()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(t('common.savedToast'));
    } catch {
      toast.error(t('toast.error'));
    }
  };

  const installApp = async () => {
    const evt = window.__pwaInstallPrompt;
    if (evt) {
      await evt.prompt();
      window.__pwaInstallPrompt = null;
      setInstallable(false);
    } else {
      toast.info(t('settings.installHint'));
    }
  };

  const langBtn = (code: Lang, label: string) => (
    <button
      key={code}
      type="button"
      onClick={() => store.setLang(code)}
      className={`btn ${store.lang === code ? 'btn-primary' : 'btn-outline'}`}
    >
      <span className={code === 'ur' ? 'font-urdu' : ''}>{label}</span>
    </button>
  );

  const rateBtn = (code: RateMode, label: string) => (
    <button
      key={code}
      type="button"
      onClick={() => store.setRateMode(code)}
      className={`btn ${store.rateMode === code ? 'btn-primary' : 'btn-outline'}`}
    >
      <span className={isUr ? 'font-urdu' : ''}>{label}</span>
    </button>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className={`text-2xl sm:text-3xl font-extrabold text-white drop-shadow mb-2 ${isUr ? 'font-urdu u-head' : ''}`}>{t('settings.title')}</h1>

      {/* language */}
      <section className="glass rounded-3xl shadow-glass p-5 space-y-3">
        <h2 className={`font-extrabold text-stone-800 flex items-center gap-2 ${isUr ? 'font-urdu u-text' : ''}`}>
          <SettingsIcon className="h-5 w-5 text-emerald-600" /> {t('settings.language')}
        </h2>
        <div className="flex flex-wrap gap-3">
          {langBtn('ur', t('settings.urdu'))}
          {langBtn('en', t('settings.english'))}
        </div>
      </section>

      {/* bubbles */}
      <section className="glass rounded-3xl shadow-glass p-5 space-y-3">
        <h2 className={`font-extrabold text-stone-800 flex items-center gap-2 ${isUr ? 'font-urdu u-text' : ''}`}>
          <MoonStar className="h-5 w-5 text-amber-600" /> {t('settings.bubbles')}
        </h2>
        <p className={`text-sm text-stone-400 ${isUr ? 'font-urdu u-text' : ''}`}>{t('settings.bubblesHint')}</p>
        <label className={`flex items-center gap-3 rounded-2xl bg-teal-50 px-4 py-3.5 cursor-pointer select-none w-fit ${isUr ? 'font-urdu u-text' : ''}`}>
          <input
            type="checkbox"
            checked={store.showBubbles}
            onChange={(e) => store.setShowBubbles(e.target.checked)}
            className="h-5 w-5 accent-emerald-600"
          />
          <span className="font-bold text-stone-700">{store.showBubbles ? 'ON' : 'OFF'}</span>
        </label>
      </section>

      {/* rate mode */}
      <section className="glass rounded-3xl shadow-glass p-5 space-y-3">
        <h2 className={`font-extrabold text-stone-800 ${isUr ? 'font-urdu u-text' : ''}`}>{t('settings.rateMode')}</h2>
        <p className={`text-sm text-stone-400 ${isUr ? 'font-urdu u-text' : ''}`}>{t('settings.rateModeHint')}</p>
        <div className="flex flex-wrap gap-3">
          {rateBtn('sqft', t('invoice.rateBySqft'))}
          {rateBtn('qty', t('invoice.rateByQty'))}
        </div>
      </section>

      {/* bill settings */}
      <section className="glass rounded-3xl shadow-glass p-5 space-y-3">
        <h2 className={`font-extrabold text-stone-800 ${isUr ? 'font-urdu u-text' : ''}`}>{t('settings.invoiceSettings')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label={t('settings.invoicePrefix')} value={prefix} onChange={setPrefix} dir="ltr" className="tabular-nums" placeholder="AF" />
          <Input label={t('settings.nextInvoiceNo')} value={nextNo} onChange={(v) => setNextNo(toLatinDigits(v))} inputMode="numeric" dir="ltr" className="tabular-nums" placeholder="1" />
        </div>
      </section>

      {/* custom columns */}
      <section className="glass rounded-3xl shadow-glass p-5 space-y-3">
        <h2 className={`font-extrabold text-stone-800 flex items-center gap-2 ${isUr ? 'font-urdu u-text' : ''}`}>
          <Columns3 className="h-5 w-5 text-teal-600" /> {t('settings.customColumns')}
        </h2>
        <p className={`text-sm text-stone-400 ${isUr ? 'font-urdu u-text' : ''}`}>{t('settings.customColumnsHint')}</p>

        {/* pick which table the columns belong to */}
        <div>
          <div className={`text-xs font-bold text-stone-400 mb-1.5 ${isUr ? 'font-urdu' : ''}`}>{t('settings.pickTable')}</div>
          <div className="flex flex-wrap gap-2">
            {COLUMN_TABLES.map((tbl) => (
              <button
                key={tbl}
                type="button"
                onClick={() => setColTable(tbl)}
                className={`btn btn-sm ${colTable === tbl ? 'btn-primary' : 'btn-outline'}`}
              >
                <span className={`text-[11px] ${isUr ? 'font-urdu' : ''}`} dir="ltr">{t(`nav.${TABLE_KEY[tbl]}`)}</span>
              </button>
            ))}
          </div>
        </div>

        {customCols.length === 0 ? (
          <p className={`text-sm text-stone-400 ${isUr ? 'font-urdu u-text' : ''}`}>{t('settings.noCustomColumns')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {customCols.map((c) => (
              <span key={c.id} className="chip chip-info gap-2">
                <span className={isUr ? 'font-urdu' : ''}>{isUr ? c.label_ur : c.label_en}</span>
                <button type="button" onClick={() => setDelCol(c)} className="hover:text-rose-600">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label={t('settings.columnNameUr')} value={newColUr} onChange={setNewColUr} />
          <Input label={t('settings.columnNameEn')} value={newColEn} onChange={setNewColEn} dir="ltr" />
        </div>
        <div>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => void addColumn()}>
            <span className={isUr ? 'font-urdu' : ''}>{t('settings.addColumn')}</span>
          </Button>
        </div>
      </section>

      {/* backup */}
      <section className="glass rounded-3xl shadow-glass p-5 space-y-3">
        <h2 className={`font-extrabold text-stone-800 ${isUr ? 'font-urdu u-text' : ''}`}>{t('settings.backup')}</h2>
        <p className={`text-sm text-stone-400 ${isUr ? 'font-urdu u-text' : ''}`}>{t('settings.backupHint')}</p>
        <div>
          <Button variant="info" icon={Download} onClick={() => void downloadBackup()}>
            <span className={isUr ? 'font-urdu' : ''}>{t('settings.downloadBackup')}</span>
          </Button>
        </div>
      </section>

      {/* install app */}
      <section className="glass rounded-3xl shadow-glass p-5 space-y-3">
        <h2 className={`font-extrabold text-stone-800 flex items-center gap-2 ${isUr ? 'font-urdu u-text' : ''}`}>
          <Smartphone className="h-5 w-5 text-emerald-600" /> {t('settings.installApp')}
        </h2>
        <p className={`text-sm text-stone-400 ${isUr ? 'font-urdu u-text' : ''}`}>{t('settings.installHint')}</p>
        <div>
          <Button variant="success" icon={Smartphone} disabled={!installable} onClick={() => void installApp()}>
            <span className={isUr ? 'font-urdu' : ''}>{t('settings.installNow')}</span>
          </Button>
        </div>
      </section>

      {/* save */}
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <Button variant="success" icon={Save} onClick={() => void saveSettings()}>
          <span className={isUr ? 'font-urdu' : ''}>{t('common.save')}</span>
        </Button>
      </div>

      <p className="text-center text-xs text-white/60 pb-2" dir="ltr">
        NEW ALMAKKA FACTORY · v1.0.0
      </p>

      <ConfirmDialog
        open={Boolean(delCol)}
        title={t('common.confirmDeleteTitle')}
        message={t('settings.columnDeleteConfirm')}
        confirmLabel={t('common.delete')}
        onConfirm={doDeleteColumn}
        onClose={() => setDelCol(null)}
      />
    </div>
  );
}
