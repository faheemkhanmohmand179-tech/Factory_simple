import { useState } from 'react';
import type { FormEvent } from 'react';
import { Gem, Loader2, Lock, LogIn, Mail, TriangleAlert } from 'lucide-react';
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

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <div className="app-bg" aria-hidden="true" />
      <div className="bubbles-layer" aria-hidden="true">
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className="bubble" style={{ animationDelay: `${i * 1.7}s` }} />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="flex justify-center mb-3">
          <div className="bg-gradient-to-r from-indigo-900/60 via-violet-800/60 to-fuchsia-800/60 rounded-3xl shadow-lg">
            <LangToggle />
          </div>
        </div>
        <div className="glass rounded-3xl shadow-2xl p-6 sm:p-8">
          {/* Branding */}
          <div className="flex flex-col items-center text-center gap-2 mb-6">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-pink-600 flex items-center justify-center shadow-lg">
              <Gem className="h-8 w-8 text-white" />
            </div>
            <h1 className={`text-2xl sm:text-3xl font-extrabold text-slate-900 ${isUr ? 'font-urdu u-head' : ''}`}>
              {isUr ? FACTORY.nameUr : FACTORY.nameEn}
            </h1>
            <p className={`text-sm text-slate-500 ${isUr ? 'font-urdu u-text' : ''}`}>
              {FACTORY.line1Ur} — {isUr ? 'ماربل با رعایت دستیاب ہیں۔' : 'Every kind of marble available.'}
            </p>
          </div>

          {!isSupabaseConfigured && (
            <div className="mb-5 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 flex gap-3">
              <TriangleAlert className="h-6 w-6 shrink-0" />
              <div className={isUr ? 'font-urdu u-text' : ''}>
                <div className="font-bold">{t('auth.notConfigured')}</div>
                <div className="mt-1 leading-relaxed">{t('auth.notConfiguredHint')}</div>
              </div>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className={`block text-sm font-semibold text-slate-700 mb-1.5 ${isUr ? 'font-urdu u-text' : ''}`}>
                {t('auth.email')}
              </span>
              <div className="relative">
                <Mail className="absolute top-1/2 -translate-y-1/2 start-3.5 h-5 w-5 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  dir="ltr"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input ps-11"
                  placeholder="owner@factory.com"
                />
              </div>
            </label>

            <label className="block">
              <span className={`block text-sm font-semibold text-slate-700 mb-1.5 ${isUr ? 'font-urdu u-text' : ''}`}>
                {t('auth.password')}
              </span>
              <div className="relative">
                <Lock className="absolute top-1/2 -translate-y-1/2 start-3.5 h-5 w-5 text-slate-400 pointer-events-none" />
                <input
                  type="password"
                  dir="ltr"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input ps-11"
                  placeholder="••••••••"
                />
              </div>
            </label>

            {error && (
              <div className={`rounded-xl bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 text-sm font-semibold ${isUr ? 'font-urdu u-text' : ''}`}>
                {error}
              </div>
            )}

            <button type="submit" disabled={busy} className="btn btn-primary w-full text-base">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
              <span className={isUr ? 'font-urdu' : ''}>{busy ? t('auth.signingIn') : t('auth.signIn')}</span>
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-400" dir="ltr">
            {FACTORY.proprietorsEn} · {FACTORY.phone1} | {FACTORY.phone2}
          </p>
        </div>
      </div>
    </div>
  );
}
