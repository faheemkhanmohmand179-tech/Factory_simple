import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { FileDown, FileSpreadsheet, FileText, FileType2, MessageCircle, Table, Upload, Download, Check, X, CopyPlus } from 'lucide-react';
import Button from './Button';
import Modal from './Modal';
import { useLang } from '../../i18n';
import { useToast } from './Toast';
import { todayStr } from '../../utils/format';
import { shareText } from '../../utils/share';
import { buildShareText, buildTableHtml, htmlToPdf, type ExportColSpec } from '../../export/exportPdf';
import { exportExcel } from '../../export/exportExcel';
import { exportWord } from '../../export/exportWord';
import { exportCsv } from '../../export/exportCsv';
import { downloadTemplate } from '../../export/templateExcel';
import { parseImportFile, type ImportConfig, type ParseResult } from '../../import/importExcel';

export interface ExportCol extends ExportColSpec {
  key: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get?: (row: any) => string | number;
}

interface Props {
  title: string;
  columns: ExportCol[];
  rows: Record<string, unknown>[];
  summary?: { label: string; value: string }[];
  importCfg?: ImportConfig;
  filenameBase: string;
  onImported?: () => void;
  extra?: ReactNode;
}

type DupChoice = null | 'pending' | 'skip' | 'update';

/**
 * Color-coded export/import bar — every section gets one:
 * [PDF] [WhatsApp] [Excel] [Word] [CSV] [Import]
 */
export default function ExportImportBar({ title, columns, rows, summary, importCfg, filenameBase, onImported, extra }: Props) {
  const { t, lang, isUr } = useLang();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const spec = () => ({
    title,
    columns: columns.map(({ key: _key, get: _get, ...c }) => c),
    rows: rows.map((r) => columns.map((c) => (c.get ? c.get(r) : ((r[c.key] ?? '') as string | number)))),
    summary,
    lang
  });

  const run = async (name: string, fn: () => void | Promise<void>) => {
    setBusy(name);
    try {
      await fn();
    } catch {
      toast.error(t('toast.error'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="pdf" size="sm" icon={FileDown} loading={busy === 'pdf'} onClick={() => void run('pdf', () => htmlToPdf(buildTableHtml(spec()), `${filenameBase}-${todayStr()}.pdf`, 'a4'))}>
        {t('exportbar.pdf')}
      </Button>
      <Button
        variant="whatsapp"
        size="sm"
        icon={MessageCircle}
        loading={busy === 'wa'}
        onClick={() => void run('wa', () => shareText(buildShareText(spec())))}
      >
        {t('exportbar.wa')}
      </Button>
      <Button variant="excel" size="sm" icon={FileSpreadsheet} loading={busy === 'excel'} onClick={() => void run('excel', () => exportExcel(spec(), `${filenameBase}-${todayStr()}.xlsx`))}>
        {t('exportbar.excel')}
      </Button>
      <Button variant="word" size="sm" icon={FileType2} loading={busy === 'word'} onClick={() => void run('word', () => exportWord(spec(), `${filenameBase}-${todayStr()}.docx`))}>
        {t('exportbar.word')}
      </Button>
      <Button variant="csv" size="sm" icon={Table} loading={busy === 'csv'} onClick={() => void run('csv', () => exportCsv(spec(), `${filenameBase}-${todayStr()}.csv`))}>
        {t('exportbar.csv')}
      </Button>
      {importCfg && (
        <Button variant="import" size="sm" icon={Upload} onClick={() => setImportOpen(true)}>
          {t('exportbar.importBtn')}
        </Button>
      )}
      {extra}

      {importCfg && (
        <ImportModal
          open={importOpen}
          onClose={() => setImportOpen(false)}
          title={title}
          cfg={importCfg}
          existing={rows}
          onImported={onImported}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Import modal: template → choose file → validated preview →
// duplicate choice → batch insert into Supabase
// ─────────────────────────────────────────────────────────────────────
function ImportModal({
  open,
  onClose,
  title,
  cfg,
  existing,
  onImported
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  cfg: ImportConfig;
  existing: Record<string, unknown>[];
  onImported?: () => void;
}) {
  const { t, lang, isUr } = useLang();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [askDup, setAskDup] = useState<DupChoice | null>(null);
  const [fileName, setFileName] = useState('');

  const close = () => {
    setParsed(null);
    setAskDup(null);
    setFileName('');
    onClose();
  };

  const onFile = async (f: File | null) => {
    if (!f) return;
    setFileName(f.name);
    setBusy(true);
    try {
      const res = await parseImportFile(f, cfg);
      if (res.fatal === 'header-not-found') toast.error(t('import.headerNotFound'));
      else if (res.fatal === 'empty') toast.error(t('import.emptyFile'));
      else if (res.fatal) toast.error(t('import.error'));
      setParsed(res.fatal ? null : res);
    } catch {
      toast.error(t('import.error'));
      setParsed(null);
    } finally {
      setBusy(false);
    }
  };

  const validRows = (parsed?.results ?? []).filter((r) => r.row);
  const duplicates = validRows.filter((r) => cfg.findDuplicate?.(existing, r.row!));
  const freshRows = validRows.filter((r) => !cfg.findDuplicate?.(existing, r.row!));

  const doImport = async (dupChoice: Exclude<DupChoice, null> | 'none') => {
    setBusy(true);
    try {
      if (freshRows.length > 0) await cfg.insertRows(freshRows.map((r) => r.row!));
      if (dupChoice === 'update') {
        for (const r of duplicates) {
          const dup = cfg.findDuplicate?.(existing, r.row!);
          if (dup && cfg.updateRow) await cfg.updateRow(dup, r.row!);
        }
      }
      const count = dupChoice === 'update' ? freshRows.length + duplicates.length : freshRows.length;
      toast.success(`${new Intl.NumberFormat('en-US').format(count)} ${t('import.done')}`);
      onImported?.();
      close();
    } catch {
      toast.error(navigator.onLine ? t('toast.error') : t('toast.offline'));
    } finally {
      setBusy(false);
      setAskDup(null);
    }
  };

  const onImportClick = () => {
    if (duplicates.length > 0 && cfg.updateRow) setAskDup('pending');
    else void doImport('skip');
  };

  const footer = (
    <div className="flex flex-wrap items-center gap-3 justify-end">
      {parsed && (
        <span className={`text-sm font-bold me-auto ${isUr ? 'font-urdu u-text' : ''} ${parsed.badCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
          {t('import.summaryLine', { ok: parsed.okCount, bad: parsed.badCount })}
        </span>
      )}
      <button type="button" className="btn btn-neutral" onClick={close}>
        <X className="h-5 w-5" />
        <span>{t('import.dontImport')}</span>
      </button>
      {parsed && parsed.okCount > 0 && (
        <button type="button" className="btn btn-success" disabled={busy} onClick={onImportClick}>
          <Check className="h-5 w-5" />
          <span>{t('import.doImport')}</span>
        </button>
      )}
    </div>
  );

  return (
    <Modal open={open} onClose={close} title={`${t('import.title')} — ${title}`} footer={footer} wide>
      {/* Step 1: template + file */}
      <div className="flex flex-wrap gap-3 mb-5">
        <Button variant="info" size="sm" icon={Download} onClick={() => downloadTemplate(title, cfg, lang)}>
          {t('import.downloadTemplate')}
        </Button>
        <Button variant="primary" size="sm" icon={Upload} loading={busy && !parsed} onClick={() => fileRef.current?.click()}>
          {t('import.chooseFile')}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            void onFile(e.target.files?.[0] ?? null);
            e.target.value = '';
          }}
        />
        {fileName && (
          <span className={`chip chip-static bg-teal-50 text-teal-700 ${isUr ? 'font-urdu' : ''}`} dir="ltr">
            {fileName}
          </span>
        )}
      </div>

      {/* duplicate choice */}
      {askDup === 'pending' && (
        <div className="mb-5 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 space-y-3">
          <div className={`font-extrabold text-amber-800 ${isUr ? 'font-urdu u-text' : ''}`}>
            {t('import.dupQuestion', { n: duplicates.length })}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="warning" size="sm" icon={X} loading={busy} onClick={() => void doImport('skip')}>
              {t('import.skipDups')}
            </Button>
            <Button variant="primary" size="sm" icon={CopyPlus} loading={busy} onClick={() => void doImport('update')}>
              {t('import.updateDups')}
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: preview */}
      {parsed ? (
        <div className="overflow-x-auto scroll-slim rounded-2xl border border-stone-200">
          <table className="w-full min-w-[720px] text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white">
                <th className="px-3 py-2.5 text-start">#</th>
                {cfg.columns.map((c) => (
                  <th key={c.key} className="px-3 py-2.5 text-start whitespace-nowrap">
                    {lang === 'ur' ? c.labels[0] : c.labels[1]}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-start">{t('common.status')}</th>
              </tr>
            </thead>
            <tbody>
              {parsed.results.slice(0, 100).map((r, i) => {
                const dup = r.row ? cfg.findDuplicate?.(existing, r.row) : undefined;
                return (
                  <tr
                    key={i}
                    className={`border-b border-stone-100 ${
                      r.error ? 'bg-rose-50' : dup ? 'bg-amber-50' : 'bg-emerald-50/60'
                    }`}
                  >
                    <td className="px-3 py-2 tabular-nums text-stone-400" dir="ltr">{i + 1}</td>
                    {cfg.columns.map((c) => (
                      <td key={c.key} className={`px-3 py-2 ${isUr ? 'font-urdu' : ''}`}>
                        {r.raw[c.key] || '-'}
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      {r.error ? (
                        <span className={`inline-flex items-center gap-1 font-bold text-rose-600 ${isUr ? 'font-urdu' : ''}`}>
                          <X className="h-3.5 w-3.5" /> {r.error}
                        </span>
                      ) : dup ? (
                        <span className={`inline-flex items-center gap-1 font-bold text-amber-600 ${isUr ? 'font-urdu' : ''}`}>
                          <FileText className="h-3.5 w-3.5" /> {t('import.duplicates')}
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 font-bold text-emerald-600 ${isUr ? 'font-urdu' : ''}`}>
                          <Check className="h-3.5 w-3.5" /> {t('import.rowOk')}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {parsed.results.length > 100 && (
            <div className={`px-3 py-2 text-xs text-stone-400 text-center ${isUr ? 'font-urdu' : ''}`} dir="ltr">
              + {parsed.results.length - 100}
            </div>
          )}
        </div>
      ) : (
        <div className={`rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/50 p-8 text-center ${isUr ? 'font-urdu u-text' : ''}`}>
          <FileSpreadsheet className="h-10 w-10 text-teal-400 mx-auto mb-3" />
          <div className="font-bold text-stone-600">{t('import.preview')}: {t('common.swipeHint')}</div>
        </div>
      )}
    </Modal>
  );
}
