import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, Save, X, XCircle } from 'lucide-react';
import { useLang } from '../../i18n';
import { useToast } from './Toast';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Any unsaved changes? Intercept close and ask Save / Don't Save */
  dirty?: boolean;
  /** Called when the user chooses Save (from footer or the unsaved-confirm) */
  onSave?: () => void | Promise<void>;
  saveLabel?: string;
  discardLabel?: string;
  footer?: ReactNode;
  wide?: boolean;
}

/**
 * Modal that renders ABOVE EVERYTHING (overlay 9999 / panel 10000).
 * - Bottom-sheet on phones, centered dialog on desktop
 * - ESC / overlay click / X all close (with unsaved-changes confirm when dirty)
 * - Default footer = [✔ Save] [✖ Don't Save] exactly as the spec requires
 */
export default function Modal({ open, onClose, title, children, dirty = false, onSave, saveLabel, discardLabel, footer, wide = false }: Props) {
  const { t, isUr } = useLang();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);

  // lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // reset confirm strip whenever (re)opened
  useEffect(() => {
    if (open) setConfirming(false);
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') attemptClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dirty, onSave]);

  if (!open) return null;

  const hardClose = () => {
    setConfirming(false);
    onClose();
  };

  const discardAndClose = () => {
    if (dirty) toast.discard(t('toast.discarded'));
    hardClose();
  };

  const attemptClose = () => {
    if (dirty && onSave) setConfirming(true);
    else hardClose();
  };

  const doSave = async () => {
    setConfirming(false);
    await onSave?.();
    // parent closes the modal itself when the save succeeds
  };

  return (
    <>
      {/* overlay — everything else (navbar, sidebar, bubbles) sits behind it */}
      <div className="modal-overlay" onClick={attemptClose} />
      <div className="modal-shell">
        <div className={`modal-panel ${wide ? 'max-w-5xl' : 'max-w-3xl'} ${isUr ? 'font-urdu-safe' : ''}`} role="dialog" aria-modal="true">
          {/* title bar */}
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 bg-white/95 backdrop-blur border-b border-slate-100 rounded-t-3xl">
            <h3 className={`text-lg font-extrabold text-slate-900 truncate ${isUr ? 'font-urdu u-head' : ''}`}>{title}</h3>
            <button
              type="button"
              onClick={attemptClose}
              className="h-11 w-11 shrink-0 grid place-items-center rounded-2xl bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-500 transition active:scale-95"
              aria-label={t('common.close')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* body */}
          <div className="px-5 py-5">{children}</div>

          {/* footer / unsaved-confirm */}
          <div className="sticky bottom-0 px-5 py-4 bg-white/95 backdrop-blur border-t border-slate-100 rounded-b-3xl">
            {confirming ? (
              <div className="space-y-3">
                <div className={`rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm font-bold text-amber-800 ${isUr ? 'u-text' : ''}`}>
                  {t('common.unsavedTitle')}
                </div>
                <div className="flex flex-wrap gap-3 justify-end">
                  <button type="button" className="btn btn-success" onClick={doSave}>
                    <Save className="h-5 w-5" />
                    <span>{saveLabel ?? t('common.save')}</span>
                  </button>
                  <button type="button" className="btn btn-neutral" onClick={discardAndClose}>
                    <XCircle className="h-5 w-5" />
                    <span>{discardLabel ?? t('common.dontSave')}</span>
                  </button>
                </div>
              </div>
            ) : (
              footer ?? (
                onSave ? (
                  <div className="flex flex-wrap gap-3 justify-end">
                    <button type="button" className="btn btn-success" onClick={doSave}>
                      <Check className="h-5 w-5" />
                      <span>{saveLabel ?? t('common.save')}</span>
                    </button>
                    <button type="button" className="btn btn-neutral" onClick={discardAndClose}>
                      <X className="h-5 w-5" />
                      <span>{discardLabel ?? t('common.dontSave')}</span>
                    </button>
                  </div>
                ) : null
              )
            )}
          </div>
        </div>
      </div>
    </>
  );
}
