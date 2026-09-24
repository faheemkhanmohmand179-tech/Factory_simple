import type { ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import Modal from './Modal';
import { useLang } from '../../i18n';

interface Props {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger' | 'warning' | 'primary';
  icon?: ReactNode;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

/** Small confirmation dialog — used for deletes & duplicate choices */
export default function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel, tone = 'danger', icon, onConfirm, onClose }: Props) {
  const { t, isUr } = useLang();

  const footer = (
    <div className="flex flex-wrap gap-3 justify-end">
      <button type="button" className="btn btn-outline" onClick={onClose}>
        {cancelLabel ?? t('common.cancel')}
      </button>
      <button
        type="button"
        className={`btn ${tone === 'danger' ? 'btn-danger' : tone === 'warning' ? 'btn-warning' : 'btn-primary'}`}
        onClick={() => {
          void onConfirm();
        }}
      >
        {confirmLabel}
      </button>
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title={title} footer={footer}>
      <div className={`flex items-start gap-4 ${isUr ? 'font-urdu u-text' : ''}`}>
        <div className={`h-12 w-12 shrink-0 rounded-2xl grid place-items-center ${tone === 'danger' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
          {icon ?? <TriangleAlert className="h-6 w-6" />}
        </div>
        <div className="text-stone-700 font-semibold pt-1 text-base leading-relaxed">{message}</div>
      </div>
    </Modal>
  );
}
