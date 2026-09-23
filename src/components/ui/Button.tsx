import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export type BtnVariant =
  | 'primary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'pdf'
  | 'whatsapp'
  | 'excel'
  | 'word'
  | 'csv'
  | 'import'
  | 'neutral'
  | 'outline'
  | 'ghost';

export type BtnSize = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: LucideIcon;
  loading?: boolean;
  full?: boolean;
  children?: ReactNode;
}

/** Gradient + shadow + press-scale button. Heights grow automatically for Urdu (see index.css). */
export default function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  full = false,
  children,
  className = '',
  disabled,
  ...rest
}: Props) {
  const cls = [
    'btn',
    `btn-${variant}`,
    size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '',
    full ? 'w-full' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={cls} disabled={disabled || loading} {...rest}>
      {loading ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" /> : Icon ? <Icon className="h-5 w-5 shrink-0" /> : null}
      {children ? <span className="truncate">{children}</span> : null}
    </button>
  );
}
