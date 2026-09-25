import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { WifiOff, Download, X } from 'lucide-react';
import { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import BubbleBackground from './BubbleBackground';
import { useAppStore } from '../../store/useAppStore';
import { useLang } from '../../i18n';

/** App frame: gradient+bubbles background, navbar, sidebar, page outlet, bottom nav */
export default function AppShell() {
  const location = useLocation();
  const setActiveModule = useAppStore((s) => s.setActiveModule);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const { t, isUr, lang } = useLang();
  const [online, setOnline] = useState(navigator.onLine);
  const [installEvt, setInstallEvt] = useState<(Event & { prompt: () => Promise<void> }) | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(localStorage.getItem('almakka-install-dismissed') === '1');

  // track active module + keep <html> attrs in sync
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isUr ? 'rtl' : 'ltr';
    const key = location.pathname === '/' ? 'dashboard' : location.pathname.split('/')[1];
    setActiveModule(key);
    // a tapped tab opens its content at the TOP of the page
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname, lang, isUr, setActiveModule]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    const onInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as Event & { prompt: () => Promise<void> });
    };
    const onInstalled = () => {
      setInstallEvt(null);
      setBannerDismissed(true);
    };
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    window.addEventListener('beforeinstallprompt', onInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      window.removeEventListener('beforeinstallprompt', onInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  return (
    <div className="min-h-screen relative">
      <BubbleBackground />

      <Navbar />
      <Sidebar />

      <main
        className={`relative z-10 max-w-[1600px] mx-auto w-full px-3 sm:px-5 pt-20 pb-28 lg:pb-10 transition-[padding] duration-300 ${
          sidebarCollapsed ? 'lg:ps-24' : 'lg:ps-[17rem]'
        }`}
      >
        {/* gentle offline warning — saving needs internet (Supabase) */}
        {!online && (
          <div className={`mb-4 rounded-2xl bg-rose-500/90 backdrop-blur text-white px-4 py-3 font-bold text-sm flex items-center gap-2.5 shadow-lg fade-in ${isUr ? 'font-urdu u-text' : ''}`}>
            <WifiOff className="h-5 w-5 shrink-0" />
            {t('offline.banner')}
          </div>
        )}

        {/* custom install banner (dismissible) */}
        {installEvt && !bannerDismissed && (
          <div className="mb-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-amber-600 text-white px-4 py-3.5 flex items-center gap-3 shadow-lg fade-in">
            <Download className="h-5 w-5 shrink-0" />
            <span className={`text-sm font-bold flex-1 ${isUr ? 'font-urdu u-text' : ''}`}>{t('settings.installBanner')}</span>
            <button
              type="button"
              className="rounded-xl bg-white text-emerald-700 font-extrabold text-xs px-3.5 h-9 active:scale-95 transition"
              onClick={() => void installEvt.prompt()}
            >
              {t('settings.installNow')}
            </button>
            <button
              type="button"
              aria-label="close"
              onClick={() => {
                setBannerDismissed(true);
                localStorage.setItem('almakka-install-dismissed', '1');
              }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* page with smooth 200ms transition */}
        <div key={location.pathname} className="page-enter">
          <Outlet />
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
