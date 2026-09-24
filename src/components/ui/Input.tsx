import type { InputHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useLang } from '../../i18n';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
  label?: string;
  error?: string | null;
  hint?: string;
  icon?: LucideIcon;
  suffix?: ReactNode;
  urduText?: boolean;
  /** value-change handler that receives the plain string (not the event) */
  onChange?: (value: string) => void;
}

/** Labelled input. Text inputs get the Nastaliq font automatically in Urdu mode. */
export default function Input({ label, error, hint, icon: Icon, suffix, urduText, className = '', onChange, ...rest }: Props) {
  const { isUr } = useLang();
  const textish = rest.type === undefined || rest.type === 'text' || rest.type === 'tel' || rest.type === 'password';
  const useUrduFont = isUr && textish && urduText !== false;

  return (
    <label className="block">
      {label && (
        <span className={`block text-sm font-semibold text-stone-700 mb-1.5 ${isUr ? 'font-urdu u-text' : ''}`}>{label}</span>
      )}
      <div className="relative">
        {Icon && <Icon className="absolute top-1/2 -translate-y-1/2 start-3.5 h-5 w-5 text-stone-400 pointer-events-none" />}
        <input
          {...rest}
          onChange={(e) => onChange?.(e.target.value)}
          className={`input ${Icon ? 'ps-11' : ''} ${suffix ? 'pe-14' : ''} ${useUrduFont ? 'font-urdu urdu-input' : ''} ${error ? 'input-error' : ''} ${className}`}
        />
        {suffix && <div className="absolute top-1/2 -translate-y-1/2 end-3 text-sm font-bold text-stone-500">{suffix}</div>}
      </div>
      {error && <span className={`mt-1 block text-xs font-semibold text-rose-600 ${isUr ? 'font-urdu u-text' : ''}`}>{error}</span>}
      {hint && !error && <span className={`mt-1 block text-xs text-stone-400 ${isUr ? 'font-urdu u-text' : ''}`}>{hint}</span>}
    </label>
  );
}
