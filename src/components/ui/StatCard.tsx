import type { LucideIcon } from 'lucide-react';
import { useLang } from '../../i18n';

type Tone = 'indigo' | 'emerald' | 'rose' | 'amber' | 'sky' | 'violet';

const TONES: Record<Tone, { ring: string; text: string }> = {
  indigo: { ring: 'from-teal-500 to-teal-600', text: 'text-teal-600' },
  emerald: { ring: 'from-emerald-500 to-teal-600', text: 'text-emerald-600' },
  rose: { ring: 'from-rose-500 to-red-600', text: 'text-rose-600' },
  amber: { ring: 'from-amber-500 to-orange-600', text: 'text-amber-600' },
  sky: { ring: 'from-cyan-500 to-cyan-600', text: 'text-cyan-600' },
  violet: { ring: 'from-emerald-500 to-amber-600', text: 'text-emerald-600' }
};

interface Props {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
  onClick?: () => void;
}

/** Dashboard stat card — glass with a gradient icon chip */
export default function StatCard({ icon: Icon, label, value, sub, tone = 'indigo', onClick }: Props) {
  const { isUr } = useLang();
  const tn = TONES[tone];
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={`glass rounded-3xl shadow-glass p-4 flex items-center gap-4 text-start hover:shadow-xl hover:-translate-y-0.5 transition ${onClick ? 'active:scale-[0.98]' : ''}`}
    >
      <div className={`h-14 w-14 shrink-0 rounded-2xl bg-gradient-to-br ${tn.ring} grid place-items-center shadow-lg`}>
        <Icon className="h-7 w-7 text-white" />
      </div>
      <div className="min-w-0">
        <div className={`text-xs sm:text-sm font-bold text-stone-500 truncate ${isUr ? 'font-urdu u-text' : ''}`}>{label}</div>
        <div className="text-xl sm:text-2xl font-extrabold text-stone-900 tabular-nums truncate" dir="ltr">
          {value}
        </div>
        {sub && (
          <div className={`text-xs font-semibold ${tn.text} tabular-nums ${isUr ? 'font-urdu u-text' : ''}`}>{sub}</div>
        )}
      </div>
    </Wrapper>
  );
}
