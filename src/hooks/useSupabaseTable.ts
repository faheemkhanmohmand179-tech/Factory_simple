import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Generic Supabase table hook: fetch + realtime subscription + CRUD helpers.
 * Every domain hook below is built on top of this one.
 */

/* ── "Something went wrong" guard ───────────────────────────────────
 * If the Supabase project has NOT yet run the update SQL
 * (supabase/UPDATE_FIX_ALL.sql), the optional columns
 * `photo_urls` / `custom_fields` don't exist yet, and every
 * insert/update fails with PostgREST error PGRST204
 * ("Could not find the 'photo_urls' column …").
 * Instead of showing a scary error, we silently retry ONCE
 * with those optional columns stripped, so saving keeps working.
 * (Run the SQL file once and photos/custom columns come alive.) */
const OPTIONAL_COLUMNS = ['photo_urls', 'custom_fields'];

type Rec = Record<string, unknown>;

function isMissingColumnError(e: unknown): boolean {
  const err = e as { code?: string; message?: string } | null;
  if (!err) return false;
  if (err.code === 'PGRST204') return true;
  const msg = (err.message ?? '').toLowerCase();
  return (
    msg.includes("could not find the '") ||
    msg.includes('column') && (msg.includes('does not exist') || msg.includes('not found'))
  );
}

function stripOptionalColumns<T extends Rec | Rec[]>(values: T): T | null {
  const clean = (v: Rec): Rec | null => {
    const out: Rec = { ...v };
    let changed = false;
    for (const col of OPTIONAL_COLUMNS) {
      if (col in out) {
        delete out[col];
        changed = true;
      }
    }
    return changed ? out : null;
  };
  if (Array.isArray(values)) {
    const arr = values.map(clean);
    return arr.some(Boolean) ? (arr as Rec[]).map((v, i) => (v ?? values[i])) as T : null;
  }
  return clean(values as Rec) as T | null;
}

export function useSupabaseTable<T extends { id: string }>(table: string, orderCol = 'created_at', asc = false) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const channelName = useMemo(() => `rt-${table}-${Math.random().toString(36).slice(2, 9)}`, [table]);

  const refresh = useCallback(async () => {
    try {
      let res;
      if (orderCol) {
        res = await supabase.from(table).select('*').order(orderCol, { ascending: asc });
      } else {
        res = await supabase.from(table).select('*');
      }
      if (res.error) throw res.error;
      if (mounted.current) {
        setRows(res.data as T[]);
        setError(null);
      }
    } catch (e) {
      console.error(`[supabase:${table}] fetch failed:`, (e as Error)?.message);
      if (mounted.current) setError((e as Error)?.message ?? 'Error');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [table, orderCol, asc]);

  useEffect(() => {
    mounted.current = true;
    refresh();
    const ch = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => refresh())
      .subscribe();
    return () => {
      mounted.current = false;
      supabase.removeChannel(ch);
    };
  }, [refresh, channelName, table]);

  const insert = useCallback(
    async (values: Record<string, unknown> | Record<string, unknown>[]) => {
      let { error: e } = await supabase.from(table).insert(values as never);
      // DB missing photo_urls/custom_fields? retry once without them
      if (e && isMissingColumnError(e)) {
        const cleaned = stripOptionalColumns(values as Rec | Rec[]);
        if (cleaned) {
          console.warn(
            `[supabase:${table}] optional columns missing — saving without photos/custom fields. ` +
              'Run supabase/UPDATE_FIX_ALL.sql in the Supabase SQL Editor to enable them.'
          );
          const retry = await supabase.from(table).insert(cleaned as never);
          e = retry.error;
        }
      }
      if (e) {
        console.error(`[supabase:${table}] insert failed:`, e.message, (e as { code?: string }).code ?? '');
        throw e;
      }
      await refresh();
    },
    [table, refresh]
  );

  const update = useCallback(
    async (id: string, values: Record<string, unknown>) => {
      let { error: e } = await supabase.from(table).update(values as never).eq('id', id);
      // DB missing photo_urls/custom_fields? retry once without them
      if (e && isMissingColumnError(e)) {
        const cleaned = stripOptionalColumns(values as Rec);
        if (cleaned) {
          console.warn(
            `[supabase:${table}] optional columns missing — saving without photos/custom fields. ` +
              'Run supabase/UPDATE_FIX_ALL.sql in the Supabase SQL Editor to enable them.'
          );
          const retry = await supabase.from(table).update(cleaned as never).eq('id', id);
          e = retry.error;
        }
      }
      if (e) {
        console.error(`[supabase:${table}] update failed:`, e.message, (e as { code?: string }).code ?? '');
        throw e;
      }
      await refresh();
    },
    [table, refresh]
  );

  const upsert = useCallback(
    async (values: Record<string, unknown>, onConflict: string) => {
      let { error: e } = await supabase.from(table).upsert(values as never, { onConflict });
      if (e && isMissingColumnError(e)) {
        const cleaned = stripOptionalColumns(values as Rec);
        if (cleaned) {
          const retry = await supabase.from(table).upsert(cleaned as never, { onConflict });
          e = retry.error;
        }
      }
      if (e) {
        console.error(`[supabase:${table}] upsert failed:`, e.message, (e as { code?: string }).code ?? '');
        throw e;
      }
      await refresh();
    },
    [table, refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      const { error: e } = await supabase.from(table).delete().eq('id', id);
      if (e) {
        console.error(`[supabase:${table}] delete failed:`, e.message);
        throw e;
      }
      await refresh();
    },
    [table, refresh]
  );

  return { rows, setRows, loading, error, refresh, insert, update, upsert, remove };
}
