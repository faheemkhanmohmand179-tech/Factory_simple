import { useEffect, useState } from 'react';
import { Download, MoonStar, Save, Settings as SettingsIcon, Smartphone } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { useLang } from '../../i18n';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../lib/supabaseClient';
import { toLatinDigits, todayStr } from '../../utils/format';
import type { Lang, RateMode } from '../../types';

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
  'app_settings'
];

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
    </div>
  );
}
