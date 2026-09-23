/**
 * Auto invoice / record numbers.
 * Keeps the highest existing numeric suffix and adds 1: AF-0007 → AF-0008
 */
export function nextInvoiceNo(prefix: string, existingNos: (string | null | undefined)[]): string {
  let max = 0;
  for (const s of existingNos) {
    if (!s) continue;
    const m = /(\d+)\s*$/.exec(String(s).trim());
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  return `${prefix}-${String(max + 1).padStart(4, '0')}`;
}

export function padNo(n: number, len = 4): string {
  return String(n).padStart(len, '0');
}
