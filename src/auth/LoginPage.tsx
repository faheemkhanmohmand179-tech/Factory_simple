import { useState } from 'react';
import type { FormEvent } from 'react';
import { Loader2, Lock, Mail, TriangleAlert, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useLang } from '../i18n';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { FACTORY } from '../lib/factory';
import LangToggle from '../components/ui/LangToggle';

export default function LoginPage() {
  const { t, isUr } = useLang();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      await signIn(email.trim(), password);
    } catch {
      setError(t('auth.error'));
    } finally {
      setBusy(false);
    }
  };

  const Arrow = isUr ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen relative flex bg-[#14171a] overflow-hidden" dir={isUr ? 'rtl' : 'ltr'}>
      {/* ── quarry slab panel (brand side) ───────────────────────────── */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[42%] relative flex-col justify-between p-12 xl:p-16 overflow-hidden">
        {/* dark basalt base with carved marble veining */}
        <div className="absolute inset-0 bg-[#14171a]" />
        <svg
          className="absolute inset-0 h-full w-full opacity-[0.16]"
          viewBox="0 0 600 900"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <path d="M-20 120 C 120 60, 180 220, 340 160 S 560 40, 620 160" stroke="#B08D57" strokeWidth="1.4" fill="none" />
          <path d="M-40 340 C 100 300, 220 420, 320 350 S 520 260, 640 380" stroke="#D9CBB0" strokeWidth="0.8" fill="none" />
          <path d="M-30 540 C 140 480, 240 600, 380 540 S 540 460, 630 580" stroke="#B08D57" strokeWidth="1.1" fill="none" />
          <path d="M-20 700 C 160 640, 260 760, 400 700 S 560 640, 620 720" stroke="#D9CBB0" strokeWidth="0.6" fill="none" />
          <path d="M0 40 C 60 160, 20 280, 90 380 S 40 560, 110 700" stroke="#8A9A93" strokeWidth="0.7" fill="none" />
          <path d="M540 0 C 480 140, 560 240, 500 360 S 580 540, 520 780" stroke="#B08D57" strokeWidth="0.7" fill="none" />
        </svg>
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 90% at 15% 8%, rgba(176,141,87,0.16), transparent 55%), radial-gradient(90% 70% at 90% 95%, rgba(176,141,87,0.10), transparent 60%)'
          }}
        />

        {/* factory mark */}
        <div className="relative z-10 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#B08D57]/50 text-[#D9CBB0] text-lg font-semibold" style={{ fontFamily: "'Playfair Display', serif" }}>
            M
          </span>
          <span className="text-[#8A9A93] text-xs tracking-[0.25em] uppercase">{isUr ? 'ضلع مہمند' : 'District Mohmand'}</span>
        </div>

        {/* headline block */}
        <div className="relative z-10 max-w-md">
          <h1
            className={isUr ? 'font-urdu text-5xl leading-[1.35] text-[#F4F1EC]' : 'text-[2.75rem] leading-[1.15] text-[#F4F1EC]'}
            style={!isUr ? { fontFamily: "'Playfair Display', serif" } : undefined}
          >
            {isUr ? FACTORY.nameUr : 'New Almakka Factory'}
          </h1>
          <div className="mt-5 h-px w-16 bg-[#B08D57]" />
          <p className={`mt-5 text-[#9AA6A1] text-sm leading-relaxed ${isUr ? 'font-urdu text-lg leading-loose' : ''}`}>
            {isUr
              ? 'ہمارے ہاں ہر قسم کا ماربل با رعایت دستیاب ہے۔ بل، کھاتہ، لیبر اور اسٹاک کا مکمل ریکارڈ ایک ہی جگہ۔'
              : 'Every kind of marble, quarried and finished on site — bills, ledgers, labour and stock, kept in one record.'}
          </p>
        </div>

        {/* proprietors footer */}
        <div className="relative z-10 text-[#6B7570] text-xs leading-relaxed" dir="ltr">
          <div className="text-[#9AA6A1]">{FACTORY.proprietorsEn}</div>
          <div className="mt-1">{FACTORY.phone1} &nbsp;·&nbsp; {FACTORY.phone2}</div>
        </div>
      </div>

      {/* ── form side ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col relative">
        <div
          className="absolute inset-0 lg:hidden"
          style={{
            background:
              'radial-gradient(120% 60% at 50% -10%, rgba(176,141,87,0.14), transparent 55%)'
          }}
        />
        <div className="relative z-10 flex justify-between items-center px-5 sm:px-10 pt-6">
          {/* mobile brand mark */}
          <div className="lg:hidden flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#B08D57]/60 text-[#B08D57] text-sm font-semibold" style={{ fontFamily: "'Playfair Display', serif" }}>
              M
            </span>
            <span className={`text-[#F4F1EC] text-sm ${isUr ? 'font-urdu text-base' : 'font-semibold tracking-wide'}`}>
              {isUr ? FACTORY.nameUr : 'Almakka Factory'}
            </span>
          </div>
          <div className="lg:ms-auto">
            <LangToggle compact />
          </div>
        </div>

        <div className="relative z-10 flex-1 flex items-center justify-center px-5 sm:px-10 py-10">
          <div className="w-full max-w-[400px]">
            <div className="mb-8">
              <h2 className={`text-[#F4F1EC] ${isUr ? 'font-urdu text-3xl leading-relaxed' : 'text-2xl font-semibold'}`} style={!isUr ? { fontFamily: "'Playfair Display', serif" } : undefined}>
                {isUr ? 'لاگ اِن کریں' : 'Sign in'}
              </h2>
              <p className={`mt-2 text-[#6B7570] text-sm ${isUr ? 'font-urdu text-base' : ''}`}>
                {isUr ? 'اپنا اکاؤنٹ استعمال کر کے جاری رکھیں' : 'Continue with your account'}
              </p>
            </div>

            {!isSupabaseConfigured && (
              <div className="mb-6 rounded-xl bg-[#B08D57]/10 border border-[#B08D57]/30 p-4 text-sm text-[#D9CBB0] flex gap-3">
                <TriangleAlert className="h-5 w-5 shrink-0 mt-0.5 text-[#B08D57]" />
                <div className={isUr ? 'font-urdu' : ''}>
                  <div className="font-semibold text-[#F4F1EC]">{t('auth.notConfigured')}</div>
                  <div className="mt-1 leading-relaxed text-[#9AA6A1]">{t('auth.notConfiguredHint')}</div>
                </div>
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <label className="block">
                <span className={`block text-xs font-medium text-[#8A9A93] mb-2 tracking-wide ${isUr ? 'font-urdu text-sm' : 'uppercase'}`}>
                  {t('auth.email')}
                </span>
                <div className="relative">
                  <Mail className="absolute top-1/2 -translate-y-1/2 start-4 h-[18px] w-[18px] text-[#5C6660] pointer-events-none" />
                  <input
                    type="email"
                    dir="ltr"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl bg-[#1D2125] border border-[#2C3238] ps-11 pe-4 py-3.5 text-[#F4F1EC] text-sm placeholder:text-[#4C5550] focus:border-[#B08D57] focus:ring-2 focus:ring-[#B08D57]/20 focus:outline-none transition"
                    placeholder="owner@factory.com"
                  />
                </div>
              </label>

              <label className="block">
                <span className={`block text-xs font-medium text-[#8A9A93] mb-2 tracking-wide ${isUr ? 'font-urdu text-sm' : 'uppercase'}`}>
                  {t('auth.password')}
                </span>
                <div className="relative">
                  <Lock className="absolute top-1/2 -translate-y-1/2 start-4 h-[18px] w-[18px] text-[#5C6660] pointer-events-none" />
                  <input
                    type="password"
                    dir="ltr"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl bg-[#1D2125] border border-[#2C3238] ps-11 pe-4 py-3.5 text-[#F4F1EC] text-sm placeholder:text-[#4C5550] focus:border-[#B08D57] focus:ring-2 focus:ring-[#B08D57]/20 focus:outline-none transition"
                    placeholder="••••••••"
                  />
                </div>
              </label>

              {error && (
                <div className={`rounded-xl bg-[#7A2E2E]/20 border border-[#7A2E2E]/50 text-[#E8A0A0] px-4 py-3 text-sm font-medium ${isUr ? 'font-urdu' : ''}`}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[#B08D57] hover:bg-[#C29D63] text-[#14171a] font-semibold py-3.5 text-sm transition active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
              >
                {busy ? (
                  <Loader2 className="h-[18px] w-[18px] animate-spin" />
                ) : (
                  <Arrow className="h-[18px] w-[18px]" />
                )}
                <span className={isUr ? 'font-urdu' : ''}>{busy ? t('auth.signingIn') : t('auth.signIn')}</span>
              </button>
            </form>

            <p className="mt-10 text-center text-xs text-[#4C5550] lg:hidden" dir="ltr">
              {FACTORY.proprietorsEn} · {FACTORY.phone1}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
