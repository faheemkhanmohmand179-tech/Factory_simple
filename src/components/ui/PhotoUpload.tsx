import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ImagePlus, Loader2, Trash2, X } from 'lucide-react';
import { useLang } from '../../i18n';
import { useToast } from './Toast';
import { supabase } from '../../lib/supabaseClient';

const BUCKET = 'product-photos';

/**
 * Photo upload + gallery, backed by Supabase Storage.
 * - Always placed BELOW the main form fields (per spec) so it never
 *   pushes the important inputs down — the caller decides placement.
 * - Uploaded photos render as a grid of tiles the user scrolls to see.
 * - Works with any table: pass the current `urls` and get back the
 *   updated list via `onChange`, then save that list on your row
 *   (e.g. a `photo_urls text[]` column).
 */
export default function PhotoUpload({
  urls,
  onChange,
  folder,
  max = 6
}: {
  urls: string[];
  onChange: (urls: string[]) => void;
  /** subfolder inside the bucket, e.g. the table name — keeps files organized */
  folder: string;
  max?: number;
}) {
  const { t, isUr } = useLang();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const pick = () => fileRef.current?.click();

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const room = Math.max(0, max - urls.length);
    const list = Array.from(files).slice(0, room);
    if (list.length === 0) {
      toast.info(t('photos.limitReached'));
      return;
    }
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of list) {
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
          cacheControl: '3600',
          upsert: false
        });
        if (error) throw error;
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
      onChange([...urls, ...uploaded]);
      toast.success(t('photos.uploaded'));
    } catch (err) {
      const msg = String((err as Error)?.message ?? '').toLowerCase();
      // bucket not created yet → tell the user exactly which SQL file to run
      if (msg.includes('bucket') || msg.includes('not found')) {
        toast.error(`${t('photos.uploadError')} — ${t('photos.bucketMissing')}`);
      } else if (!navigator.onLine) {
        toast.error(t('toast.offline'));
      } else {
        toast.error(t('photos.uploadError'));
      }
      console.error('[photos] upload failed:', (err as Error)?.message);
    } finally {
      setUploading(false);
    }
  };

  const removeAt = (i: number) => {
    onChange(urls.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-3">
      <div className={`text-sm font-extrabold text-stone-700 ${isUr ? 'font-urdu u-text' : ''}`}>{t('photos.title')}</div>
      <p className={`text-xs text-stone-400 -mt-1.5 ${isUr ? 'font-urdu' : ''}`}>{t('photos.hint')}</p>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {urls.map((u, i) => (
          <div key={u + i} className="photo-tile group">
            <img
              src={u}
              alt=""
              className="h-full w-full object-cover cursor-pointer"
              onClick={() => setPreview(u)}
            />
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute top-1.5 end-1.5 h-8 w-8 grid place-items-center rounded-xl bg-rose-600/90 text-white shadow-lg active:scale-95 transition"
              title={t('common.delete')}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        {urls.length < max && (
          <button type="button" className="photo-drop" onClick={pick} disabled={uploading}>
            {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
            <span className={isUr ? 'font-urdu' : ''}>{uploading ? t('photos.uploading') : t('photos.add')}</span>
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void onFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* full-size preview — portaled to <body> so it sits ABOVE EVERYTHING
          (even above an open add-record modal, no matter its stacking) */}
      {preview &&
        createPortal(
          <>
            <div className="modal-overlay" onClick={() => setPreview(null)} />
            <div className="modal-shell" onClick={() => setPreview(null)}>
              <div className="pointer-events-auto max-w-3xl w-full p-2" onClick={(e) => e.stopPropagation()}>
                <div className="relative rounded-2xl overflow-hidden bg-black/20 ring-4 ring-white/60">
                  <img src={preview} alt="" className="w-full max-h-[80vh] object-contain bg-white" />
                  <button
                    type="button"
                    onClick={() => setPreview(null)}
                    className="absolute top-3 end-3 h-10 w-10 grid place-items-center rounded-xl bg-white/90 text-stone-700 shadow-lg"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
