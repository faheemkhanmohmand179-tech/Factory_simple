import { useEffect, useState } from 'react';
import { Gem, LogOut, PanelLeft, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { useLang } from '../../i18n';
import { useAppStore } from '../../store/useAppStore';
import { FACTORY } from '../../lib/factory';
import LangToggle from '../ui/LangToggle';
import { useToast } from '../ui/Toast';

/** Top bar: logo + factory name + online indicator + language toggle + logout */
export default function Navbar() {
  const { t, isUr } = useLang();
  const { signOut } = useAuth();
  const toast = useToast();
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

  const doLogout = async () => {
    try {
      await signOut();
    } catch {
      toast.error(t('toast.error'));
    }
  };

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
          <div className="h-10 w-10 shrink-0 rounded-2xl bg-gradient-to-br from-amber-400 via-pink-500 to-violet-600 grid place-items-center shadow-lg ring-2 ring-white/40">
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

        {/* online / offline indicator */}
        <span
          className={`inline-flex items-center gap-1.5 rounded-2xl px-2.5 sm:px-3.5 h-10 text-xs sm:text-sm font-extrabold border transition ${
            online ? 'bg-emerald-400/20 border-emerald-300/50 text-emerald-50' : 'bg-rose-500/30 border-rose-300/50 text-rose-50'
          }`}
          title={online ? t('common.online') : t('common.offline')}
        >
          {online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          <span className={`hidden sm:inline ${isUr ? 'font-urdu' : ''}`}>{online ? t('common.online') : t('common.offline')}</span>
          <span className={`h-2 w-2 rounded-full ${online ? 'bg-emerald-300 animate-pulse' : 'bg-rose-300'}`} />
        </span>

        <LangToggle />

        <button
          type="button"
          onClick={() => void doLogout()}
          title={t('nav.logout')}
          className="h-11 w-11 grid place-items-center rounded-2xl bg-white/15 hover:bg-rose-500/60 border border-white/30 text-white transition active:scale-95"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
