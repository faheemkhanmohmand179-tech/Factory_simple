import type { ReactNode } from 'react';
import { Plus, Search } from 'lucide-react';
import { useLang } from '../../i18n';

interface Props {
  title: string;
  count?: number;
  search?: { value: string; onChange: (v: string) => void; placeholder?: string };
  addLabel?: string;
  onAdd?: () => void;
  children?: ReactNode;
}

/**
 * Standard list-page header: title + count badge + search box + Add button,
 * with a slot below for filter chips / tabs.
 */
export default function PageHeader({ title, count, search, addLabel, onAdd, children }: Props) {
  const { t, isUr } = useLang();
  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className={`text-2xl sm:text-3xl font-extrabold text-white drop-shadow-lg truncate ${isUr ? 'font-urdu u-head' : ''}`}>
            {title}
          </h1>
          {count !== undefined && (
            <span className="chip chip-static bg-white/90 text-violet-700 font-extrabold tabular-nums shrink-0">
              {new Intl.NumberFormat('en-US').format(count)} {t('common.records')}
            </span>
          )}
        </div>
        {addLabel && onAdd && (
          <button type="button" className="btn btn-primary shrink-0" onClick={onAdd}>
            <Plus className="h-5 w-5" />
            <span className={isUr ? 'font-urdu' : ''}>{addLabel}</span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {search && (
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3.5 h-5 w-5 text-slate-400 pointer-events-none" />
            <input
              type="search"
              value={search.value}
              onChange={(e) => search?.onChange(e.target.value)}
              className={`input ps-11 bg-white/90 ${isUr ? 'font-urdu urdu-input' : ''}`}
              placeholder={search.placeholder ?? t('common.search')}
            />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
