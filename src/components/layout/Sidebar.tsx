import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  Boxes,
  CalendarCheck,
  ClipboardList,
  FileText,
  Gem,
  HardHat,
  LayoutDashboard,
  Receipt,
  Ruler,
  Settings,
  Shapes,
  Users,
  Wrench
} from 'lucide-react';
import { useLang } from '../../i18n';
import { useAppStore } from '../../store/useAppStore';

export const MODULES = [
  { path: '/', key: 'dashboard', icon: LayoutDashboard },
  { path: '/invoices', key: 'invoices', icon: FileText },
  { path: '/customers', key: 'customers', icon: Users },
  { path: '/labour', key: 'labour', icon: HardHat },
  { path: '/attendance', key: 'attendance', icon: CalendarCheck },
  { path: '/labour-report', key: 'labourReport', icon: ClipboardList },
  { path: '/machinery', key: 'machinery', icon: Wrench },
  { path: '/marble-types', key: 'marbleTypes', icon: Shapes },
  { path: '/marble-sizes', key: 'marbleSizes', icon: Ruler },
  { path: '/stock', key: 'stock', icon: Boxes },
  { path: '/expenses', key: 'expenses', icon: Receipt },
  { path: '/reports', key: 'reports', icon: BarChart3 },
  { path: '/settings', key: 'settings', icon: Settings }
] as const;

/** Collapsible left sidebar (desktop only — mobile uses bottom nav) */
export default function Sidebar() {
  const { t, isUr } = useLang();
  const collapsed = useAppStore((s) => s.sidebarCollapsed);

  return (
    <aside
      className={`hidden lg:flex flex-col fixed top-16 bottom-0 start-0 z-30 bg-white/15 backdrop-blur-xl border-e border-white/20 transition-[width] duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <nav className="flex-1 overflow-y-auto scroll-slim p-3 space-y-1">
        {MODULES.map(({ path, key, icon: Icon }) => (
          <NavLink
            key={key}
            to={path}
            end={path === '/'}
            title={t(`nav.${key}`)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl px-3 h-12 font-bold text-sm transition active:scale-[0.98] ${
                isActive
                  ? 'bg-white text-violet-700 shadow-lg'
                  : 'text-white/90 hover:bg-white/20'
              } ${collapsed ? 'justify-center px-0' : ''}`
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span className={`truncate ${isUr ? 'font-urdu' : ''}`}>{t(`nav.${key}`)}</span>}
          </NavLink>
        ))}
      </nav>

      <div className={`p-3 border-t border-white/15 flex items-center ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
        <div className="h-9 w-9 shrink-0 rounded-xl bg-white/25 grid place-items-center">
          <Gem className="h-4.5 w-4.5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="font-urdu text-white font-bold text-sm truncate">المکہ فیکٹری</div>
            <div className="text-[10px] text-white/70 font-bold tracking-widest" dir="ltr">ALMAKKA</div>
          </div>
        )}
      </div>
    </aside>
  );
}
