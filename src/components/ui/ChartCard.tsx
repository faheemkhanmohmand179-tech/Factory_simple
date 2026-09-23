import type { ReactNode } from 'react';
import { BarChart3, LineChart as LineChartIcon } from 'lucide-react';
import { useLang } from '../../i18n';

interface Props {
  title: string;
  icon?: 'bar' | 'line';
  height?: number;
  children: ReactNode;
}

/** Glass card wrapper for recharts charts (kept LTR inside so axes behave) */
export default function ChartCard({ title, icon = 'bar', height = 260, children }: Props) {
  const { isUr } = useLang();
  const Icon = icon === 'line' ? LineChartIcon : BarChart3;
  return (
    <div className="glass rounded-3xl shadow-glass p-4 sm:p-5">
      <div className={`flex items-center gap-2.5 mb-3 ${isUr ? 'font-urdu u-text' : ''}`}>
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 grid place-items-center shadow">
          <Icon className="h-4.5 w-4.5 text-white" />
        </div>
        <h3 className="text-base font-extrabold text-slate-800">{title}</h3>
      </div>
      <div dir="ltr" style={{ width: '100%', height }}>
        {children}
      </div>
    </div>
  );
}
