import { useCallback } from 'react';
import { useSupabaseTable } from './useSupabaseTable';
import { supabase } from '../lib/supabaseClient';
import type { Invoice, InvoiceItem } from '../types';

/**
 * Invoices + their line items + helpers that keep
 * invoice / items / ledger consistent in one pass.
 */
export function useInvoices() {
  const inv = useSupabaseTable<Invoice>('invoices', 'created_at', false);
  const itemsHook = useSupabaseTable<InvoiceItem>('invoice_items', 'created_at', false);

  /** Replace all items of an invoice */
  const replaceItems = useCallback(
    async (invoiceId: string, rows: Partial<InvoiceItem>[]) => {
      const { error: delErr } = await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);
      if (delErr) throw delErr;
      const payload = rows.map((r) => ({ ...r, invoice_id: invoiceId }));
      if (payload.length > 0) {
        const { error: insErr } = await supabase.from('invoice_items').insert(payload);
        if (insErr) throw insErr;
      }
      await itemsHook.refresh();
    },
    [itemsHook]
  );

  /** Delete invoice + items + its ledger entries */
  const removeInvoice = useCallback(
    async (invoiceId: string) => {
      await supabase.from('ledger_entries').delete().eq('invoice_id', invoiceId);
      await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);
      await supabase.from('invoices').delete().eq('id', invoiceId);
      await Promise.all([inv.refresh(), itemsHook.refresh()]);
    },
    [inv, itemsHook]
  );

  return {
    ...inv,
    items: itemsHook.rows,
    itemsLoading: itemsHook.loading,
    refreshItems: itemsHook.refresh,
    insertItems: itemsHook.insert,
    replaceItems,
    removeInvoice
  };
}
