import { MapPin, Phone, User } from 'lucide-react';
import { useLang } from '../i18n';
import { FACTORY } from '../lib/factory';

/**
 * Fixed factory letterhead card — shown on the dashboard.
 * The same text appears on every bill and every export.
 */
export default function FactoryHeader() {
  const { isUr } = useLang();
  return (
    <div className="relative overflow-visible rounded-3xl p-[3px] bg-gradient-to-r from-indigo-600 via-violet-600 via-pink-500 to-amber-500 shadow-glass">
      <div className="rounded-[1.35rem] bg-white/92 backdrop-blur-xl px-4 sm:px-8 py-5 sm:py-7 text-center">
        {/* Names — both scripts always visible */}
        <h1 className="font-urdu u-head text-2xl sm:text-4xl font-bold text-slate-900">{FACTORY.nameUr}</h1>
        <div className="text-xs sm:text-sm font-extrabold tracking-[0.25em] text-violet-700 mt-1" dir="ltr">
          {FACTORY.nameEn}
        </div>

        <div className="my-3 h-[3px] rounded-full bg-gradient-to-r from-transparent via-violet-500 to-transparent" />

        {/* Urdu taglines */}
        <p className="font-urdu u-text text-slate-700 text-base sm:text-lg">{FACTORY.line1Ur} — {FACTORY.line2Ur}</p>

        {/* Contact info — current language */}
        <div className={`mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-600 ${isUr ? 'font-urdu u-text' : ''}`}>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-pink-600 shrink-0" />
            {isUr ? FACTORY.addressUr : FACTORY.addressEn}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <User className="h-4 w-4 text-indigo-600 shrink-0" />
            {isUr ? FACTORY.proprietorsUr : FACTORY.proprietorsEn}
          </span>
          <span className="inline-flex items-center gap-1.5 font-bold" dir="ltr">
            <Phone className="h-4 w-4 text-emerald-600 shrink-0" />
            {FACTORY.phone1} | {FACTORY.phone2}
          </span>
        </div>
      </div>
    </div>
  );
}
