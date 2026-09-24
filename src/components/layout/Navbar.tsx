import { useEffect, useState } from 'react';
import { Gem, PanelLeft } from 'lucide-react';
import { useLang } from '../../i18n';
import { useAppStore } from '../../store/useAppStore';
import { FACTORY } from '../../lib/factory';

/** Top bar: logo + factory name + a small online/offline dot. Language lives in Settings. */
export default function Navbar() {
  const { t } = useLang();
  const [online, setOnline] = useState(navigator.onLine);
  const toggleSidebar = useAppStore((s) => s.setSidebarCollapsed);
  const collapsed = useAppStore((s) => s.sidebarCollapsed);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return (
    <header className="navbar-glass fixed top-0 inset-x-0 z-40">
      <div className="max-w-[1600px] mx-auto flex items-center gap-2 sm:gap-3 px-3 sm:px-5 h-16">
        {/* sidebar toggle (desktop) */}
        <button
          type="button"
          onClick={() => toggleSidebar(!collapsed)}
          className="hidden lg:grid h-11 w-11 place-items-center rounded-2xl hover:bg-white/25 text-white transition active:scale-95"
          title="Menu"
        >
          <PanelLeft className="h-5 w-5" />
        </button>

        {/* logo + name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br from-amber-400 via-emerald-500 to-teal-700 grid place-items-center shadow-lg ring-2 ring-white/40">
            <Gem className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="font-urdu text-white font-bold text-base sm:text-lg truncate u-head-sm">{FACTORY.nameUr}</div>
            <div className="text-[10px] sm:text-[11px] font-extrabold tracking-[0.18em] text-white/80 truncate hidden sm:block" dir="ltr">
              {FACTORY.nameEn}
            </div>
          </div>
        </div>

        <div className="flex-1" />

        {/* small online / offline dot — full status + language toggle live in Settings */}
        <span
          className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10"
          title={online ? t('common.online') : t('common.offline')}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${online ? 'bg-emerald-300 animate-pulse' : 'bg-rose-300'}`} />
        </span>
      </div>
    </header>
  );
}
