import { Languages } from 'lucide-react';
import { useLang } from '../../i18n';

/** اردو / English toggle — saved in localStorage via the app store */
export default function LangToggle({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLang();
  return (
    <div className="flex items-center rounded-2xl bg-white/20 border border-white/40 p-1 gap-1 shadow-inner">
      {!compact && <Languages className="h-4 w-4 text-white/80 mx-1 hidden sm:block" />}
      <button
        type="button"
        onClick={() => setLang('ur')}
        className={`rounded-xl px-3 h-9 text-sm font-extrabold transition font-urdu ${
          lang === 'ur' ? 'bg-white text-emerald-700 shadow' : 'text-white/90 hover:bg-white/20'
        }`}
      >
        اردو
      </button>
      <button
        type="button"
        onClick={() => setLang('en')}
        dir="ltr"
        className={`rounded-xl px-3 h-9 text-sm font-extrabold transition ${
          lang === 'en' ? 'bg-white text-emerald-700 shadow' : 'text-white/90 hover:bg-white/20'
        }`}
      >
        English
      </button>
    </div>
  );
}
