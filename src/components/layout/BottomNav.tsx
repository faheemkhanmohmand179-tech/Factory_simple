import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Boxes,
  CalendarCheck,
  ClipboardList,
  FileText,
  HardHat,
  Home,
  Menu,
  Receipt,
  Ruler,
  Settings,
  Shapes,
  Users,
  Wrench,
  X
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLang } from '../../i18n';

const MAIN: { path: string; key: string; icon: LucideIcon; end: boolean }[] = [
  { path: '/', key: 'dashboard', icon: Home, end: true },
  { path: '/invoices', key: 'invoices', icon: FileText, end: false },
  { path: '/customers', key: 'customers', icon: Users, end: false },
  { path: '/labour', key: 'labour', icon: HardHat, end: false }
];

const MORE: { path: string; key: string; icon: LucideIcon }[] = [
  { path: '/attendance', key: 'attendance', icon: CalendarCheck },
  { path: '/labour-report', key: 'labourReport', icon: ClipboardList },
  { path: '/machinery', key: 'machinery', icon: Wrench },
  { path: '/marble-types', key: 'marbleTypes', icon: Shapes },
  { path: '/marble-sizes', key: 'marbleSizes', icon: Ruler },
  { path: '/stock', key: 'stock', icon: Boxes },
  { path: '/expenses', key: 'expenses', icon: Receipt },
  { path: '/reports', key: 'reports', icon: BarChart3 },
  { path: '/settings', key: 'settings', icon: Settings }
];

/** Mobile bottom nav: Dashboard · Bill · Customers · Labour · More (sheet) */
export default function BottomNav() {
  const { t, isUr } = useLang();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  // close the sheet on navigation
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 navbar-glass border-t border-white/20 pb-safe">
        <div className="grid grid-cols-5">
          {MAIN.map(({ path, key, icon: Icon, end }) => (
            <NavLink
              key={key}
              to={path}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 h-16 text-[10px] font-extrabold transition ${
                  isActive ? 'text-white' : 'text-white/60'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`h-9 w-14 rounded-2xl grid place-items-center transition ${isActive ? 'bg-white/25' : ''}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className={`leading-none ${isUr ? 'font-urdu' : ''}`}>{t(`nav.${key}`)}</span>
                </>
              )}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className={`flex flex-col items-center justify-center gap-0.5 h-16 text-[10px] font-extrabold transition ${
              moreOpen ? 'text-white' : 'text-white/60'
            }`}
          >
            <span className={`h-9 w-14 rounded-2xl grid place-items-center transition ${moreOpen ? 'bg-white/25' : ''}`}>
              {moreOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </span>
            <span className={`leading-none ${isUr ? 'font-urdu' : ''}`}>{t('nav.more')}</span>
          </button>
        </div>
      </nav>

      {/* More sheet — above everything except modals/toasts */}
      {moreOpen && (
        <>
          <div className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm fade-in lg:hidden" onClick={() => setMoreOpen(false)} />
          <div className="fixed bottom-0 inset-x-0 z-[9999] lg:hidden rounded-t-3xl bg-white shadow-2xl slide-up pb-safe max-h-[75vh] overflow-y-auto scroll-slim">
            <div className="sticky top-0 bg-white/95 backdrop-blur px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className={`text-lg font-extrabold text-stone-900 ${isUr ? 'font-urdu u-head' : ''}`}>{t('nav.more')}</h3>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="h-11 w-11 grid place-items-center rounded-2xl bg-stone-100 text-stone-500 active:scale-95"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {MORE.map(({ path, key, icon: Icon }) => (
                <NavLink
                  key={key}
                  to={path}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-2 rounded-3xl px-3 py-5 font-extrabold text-sm transition active:scale-95 ${
                      isActive ? 'bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-lg' : 'bg-teal-50 text-teal-700'
                    }`
                  }
                >
                  <Icon className="h-7 w-7" />
                  <span className={`text-center leading-snug ${isUr ? 'font-urdu' : ''}`}>{t(`nav.${key}`)}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
