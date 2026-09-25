import type { ReactNode } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useLang } from '../../i18n';

export interface Col<T = Record<string, unknown>> {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  render?: (row: T) => ReactNode;
  className?: string;
}

interface Props<T> {
  columns: Col<T>[];
  rows: T[];
  rowKey?: (row: T, index: number) => string;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  extraActions?: (row: T) => ReactNode;
  loading?: boolean;
  emptyTitle?: string;
  emptyHint?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  rowClass?: (row: T) => string;
  footer?: ReactNode;
}

/**
 * Scrollable data table:
 * sticky gradient header · zebra rows · right-aligned tabular numbers ·
 * min-width 720px so phones scroll instead of squish · swipe hint chip ·
 * skeleton loading · friendly empty state.
 */
export default function DataTable<T = Record<string, unknown>>({
  columns,
  rows,
  rowKey,
  onEdit,
  onDelete,
  extraActions,
  loading = false,
  emptyTitle,
  emptyHint,
  emptyActionLabel,
  onEmptyAction,
  rowClass,
  footer
}: Props<T>) {
  const { t, isUr } = useLang();
  const hasActions = Boolean(onEdit || onDelete || extraActions);

  return (
    <div className="glass rounded-xl shadow-glass overflow-hidden">
      {/* mobile swipe hint */}
      <div className="sm:hidden flex justify-end px-3 pt-2.5">
        <span className={`chip chip-static text-[11px] ${isUr ? 'font-urdu' : ''}`}>{t('common.swipeHint')}</span>
      </div>

      <div className="overflow-x-auto scroll-slim">
        <table className={`w-full min-w-[600px] sm:min-w-[720px] text-[13px] sm:text-sm table-colorful ${isUr ? 'urdu-table' : ''}`}>
          <thead>
            <tr className="text-white" style={{ background: 'linear-gradient(90deg, #0f766e 0%, #059669 45%, #ca8a04 130%)' }}>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`sticky top-0 z-[5] px-3 sm:px-4 py-3 sm:py-3.5 font-bold text-start whitespace-nowrap ${
                    isUr ? 'font-urdu u-head-sm' : ''
                  } ${c.align === 'right' ? 'text-end' : c.align === 'center' ? 'text-center' : ''}`}
                  style={{ background: 'linear-gradient(90deg, #0f766e 0%, #059669 45%, #ca8a04 130%)' }}
                >
                  {c.label}
                </th>
              ))}
              {hasActions && (
                <th
                  className="sticky top-0 z-[5] px-3 sm:px-4 py-3 sm:py-3.5 font-bold text-center whitespace-nowrap"
                  style={{ background: 'linear-gradient(90deg, #0f766e 0%, #059669 45%, #ca8a04 130%)' }}
                >
                  {t('common.actions')}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-stone-100">
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-4">
                        <div className="h-4 rounded bg-stone-200 animate-pulse" />
                      </td>
                    ))}
                    {hasActions && (
                      <td className="px-4 py-4">
                        <div className="h-9 w-9 rounded bg-stone-200 animate-pulse mx-auto" />
                      </td>
                    )}
                  </tr>
                ))
              : rows.map((row, i) => (
                  <tr
                    key={rowKey ? rowKey(row, i) : ((row as { id?: string }).id ?? String(i))}
                    className={`transition-colors ${rowClass ? rowClass(row) : ''}`}
                  >
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={`px-3 sm:px-4 py-2.5 sm:py-3 text-stone-700 ${isUr && !c.render ? 'font-urdu u-text' : ''} ${c.align === 'right' ? 'text-end tabular-nums' : c.align === 'center' ? 'text-center' : ''} ${c.className ?? ''}`}
                      >
                        {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '-')}
                      </td>
                    ))}
                    {hasActions && (
                      <td className="px-2.5 sm:px-4 py-2">
                        <div className="flex items-center justify-center gap-1.5">
                          {extraActions?.(row)}
                          {onEdit && (
                            <button
                              type="button"
                              onClick={() => onEdit(row)}
                              title={t('common.edit')}
                              className="h-11 w-11 grid place-items-center rounded-xl bg-cyan-100 text-cyan-600 hover:bg-cyan-200 transition active:scale-95"
                            >
                              <Pencil className="h-4.5 w-4.5" />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              type="button"
                              onClick={() => onDelete(row)}
                              title={t('common.delete')}
                              className="h-11 w-11 grid place-items-center rounded-xl bg-rose-100 text-rose-600 hover:bg-rose-200 transition active:scale-95"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
          </tbody>
          {footer && <tfoot className="bg-teal-50/80 font-extrabold text-stone-800">{footer}</tfoot>}
        </table>

        {!loading && rows.length === 0 && (
          <div className="px-4 py-14 flex flex-col items-center text-center gap-3">
            <div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-teal-100 to-emerald-100 grid place-items-center">
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-teal-400" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" strokeLinecap="round" />
                <rect x="9" y="3" width="6" height="4" rx="1" />
              </svg>
            </div>
            <div className={`text-lg font-extrabold text-stone-700 ${isUr ? 'font-urdu u-text' : ''}`}>
              {emptyTitle ?? t('common.noRecords')}
            </div>
            {emptyHint && (
              <div className={`text-sm text-stone-400 ${isUr ? 'font-urdu u-text' : ''}`}>{emptyHint}</div>
            )}
            {emptyActionLabel && onEmptyAction && (
              <button type="button" className="btn btn-primary mt-2" onClick={onEmptyAction}>
                {emptyActionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
