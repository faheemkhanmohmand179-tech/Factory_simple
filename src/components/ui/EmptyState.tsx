import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useLang } from '../../i18n';

interface Props {
  icon?: LucideIcon;
  title?: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
}

/** Friendly empty state: big icon + "ابھی کوئی ریکارڈ نہیں" + big Add button */
export default function EmptyState({ icon: Icon, title, hint, actionLabel, onAction, children }: Props) {
  const { t, isUr } = useLang();
  return (
    <div className="glass rounded-3xl shadow-glass px-4 py-14 flex flex-col items-center text-center gap-4">
      <div className="h-20 w-20 rounded-4xl bg-gradient-to-br from-indigo-500 via-violet-500 to-pink-500 grid place-items-center shadow-lg">
        {Icon ? <Icon className="h-10 w-10 text-white" /> : null}
      </div>
      <div className={`text-xl font-extrabold text-slate-700 ${isUr ? 'font-urdu u-text' : ''}`}>{title ?? t('common.noRecords')}</div>
      {hint && <div className={`text-sm text-slate-400 max-w-sm ${isUr ? 'font-urdu u-text' : ''}`}>{hint}</div>}
      {actionLabel && onEmptyActionGuard()}
      {children}
    </div>
  );

  function onEmptyActionGuard() {
    return (
      <button type="button" className="btn btn-primary btn-lg mt-1" onClick={onAction}>
        {actionLabel}
      </button>
    );
  }
}
