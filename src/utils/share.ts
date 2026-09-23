/** Web Share API with WhatsApp (wa.me) fallback */
export async function shareText(text: string): Promise<void> {
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return;
    } catch {
      // user cancelled the native sheet → fall through to WhatsApp link
    }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
}

/** Is the device online? (used by the navbar indicator + gentle save warnings) */
export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine !== false;
}
