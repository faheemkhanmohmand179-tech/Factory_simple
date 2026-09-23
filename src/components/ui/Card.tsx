import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  pad?: boolean;
}

/** Glassmorphism card (bg-white/85 + backdrop blur) floating on the gradient + bubbles */
export default function Card({ children, className = '', pad = true }: Props) {
  return <div className={`glass rounded-3xl shadow-glass ${pad ? 'p-4 sm:p-6' : ''} ${className}`}>{children}</div>;
}
