import { useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronDown, PenLine } from 'lucide-react';
import { useLang } from '../../i18n';
import { CUSTOM_VALUE } from '../../types';

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  allowCustom?: boolean;
  placeholder?: string;
  icon?: LucideIcon;
  dirLtr?: boolean;
  className?: string;
}

/**
 * Dropdown with a "دیگر (خود لکھیں) / Other (type your own)" option that
 * reveals a free-text input. Emits the plain string — the caller decides
 * whether it belongs to the list or a custom_* column.
 */
export default function Select({
  value,
  onChange,
  options,
  label,
  allowCustom = false,
  placeholder,
  icon: Icon,
  dirLtr = false,
  className = ''
}: Props) {
  const { t, isUr } = useLang();

  const inList = useMemo(() => options.some((o) => o.value === value), [options, value]);
  const customMode = allowCustom && value !== '' && !inList;

  const selectValue = customMode ? CUSTOM_VALUE : value;

  return (
    <label className="block">
      {label && (
        <span className={`block text-sm font-semibold text-stone-700 mb-1.5 ${isUr ? 'font-urdu u-text' : ''}`}>{label}</span>
      )}
      <div className="relative">
        {Icon && <Icon className="absolute top-1/2 -translate-y-1/2 start-3.5 h-5 w-5 text-stone-400 pointer-events-none" />}
        <select
          value={selectValue}
          onChange={(e) => {
            const v = e.target.value;
            if (v === CUSTOM_VALUE) {
              onChange(''); // switch to custom → empty text input
            } else {
              onChange(v);
            }
          }}
          className={`input appearance-none cursor-pointer ${Icon ? 'ps-11' : 'ps-4'} pe-10 ${isUr ? 'font-urdu urdu-input' : ''} ${className}`}
          dir={dirLtr ? 'ltr' : undefined}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value} dir={dirLtr ? 'ltr' : undefined}>
              {o.label}
            </option>
          ))}
          {allowCustom && (
            <option value={CUSTOM_VALUE} dir={isUr ? 'rtl' : 'ltr'}>
              {t('common.otherTypeYourOwn')}
            </option>
          )}
        </select>
        <ChevronDown className="absolute top-1/2 -translate-y-1/2 end-3.5 h-5 w-5 text-stone-400 pointer-events-none" />
      </div>

      {customMode && (
        <div className="relative mt-2">
          <PenLine className="absolute top-1/2 -translate-y-1/2 start-3.5 h-4 w-4 text-emerald-500 pointer-events-none" />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`input ps-10 font-semibold ${isUr ? 'font-urdu urdu-input' : ''}`}
            dir={dirLtr ? 'ltr' : undefined}
            placeholder={isUr ? 'خود لکھیں...' : 'Type here...'}
            autoFocus
          />
        </div>
      )}
    </label>
  );
}
