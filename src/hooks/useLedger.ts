import { useSupabaseTable } from './useSupabaseTable';
import type { Customer, LedgerEntry } from '../types';
import { num } from '../utils/format';

export function useLedger() {
  const base = useSupabaseTable<LedgerEntry>('ledger_entries', 'entry_date', true);
  return base;
}

export interface PartyBalance {
  debit: number;
  credit: number;
  balance: number;
}

/**
 * Shopkeeper accounting — one simple running balance per party:
 *   ادھار / فروخت / ادائیگی  →  لینا بڑھتا ہے (+)
 *   جمع / خریداری            →  دینا بڑھتا ہے (−)
 * positive balance = "اس سے لینا ہے", negative = "اس کو دینا ہے"
 */
export function computeBalances(
  customers: Customer[],
  entries: LedgerEntry[]
): Map<string, PartyBalance> {
  const map = new Map<string, PartyBalance>();
  for (const c of customers) {
    const opening = num(c.opening_balance);
    map.set(c.id, {
      debit: Math.max(opening, 0),
      credit: Math.max(-opening, 0),
      balance: opening
    });
  }
  for (const e of entries) {
    const key = e.party_id ?? '';
    let b = map.get(key);
    if (!b) {
      b = { debit: 0, credit: 0, balance: 0 };
      map.set(key, b);
    }
    if (e.kind === 'udhaar' || e.kind === 'farokht' || e.kind === 'payment') {
      b.debit += num(e.amount);
    } else {
      b.credit += num(e.amount);
    }
    b.balance = b.debit - b.credit;
  }
  return map;
}
