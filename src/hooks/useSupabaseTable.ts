import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Generic Supabase table hook: fetch + realtime subscription + CRUD helpers.
 * Every domain hook below is built on top of this one.
 */
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
      const { error: e } = await supabase.from(table).insert(values as never);
      if (e) throw e;
      await refresh();
    },
    [table, refresh]
  );

  const update = useCallback(
    async (id: string, values: Record<string, unknown>) => {
      const { error: e } = await supabase.from(table).update(values as never).eq('id', id);
      if (e) throw e;
      await refresh();
    },
    [table, refresh]
  );

  const upsert = useCallback(
    async (values: Record<string, unknown>, onConflict: string) => {
      const { error: e } = await supabase.from(table).upsert(values as never, { onConflict });
      if (e) throw e;
      await refresh();
    },
    [table, refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      const { error: e } = await supabase.from(table).delete().eq('id', id);
      if (e) throw e;
      await refresh();
    },
    [table, refresh]
  );

  return { rows, setRows, loading, error, refresh, insert, update, upsert, remove };
}
