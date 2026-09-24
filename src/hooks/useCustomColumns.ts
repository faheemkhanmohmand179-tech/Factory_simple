import { useSupabaseTable } from './useSupabaseTable';
import type { CustomColumn } from '../types';

/**
 * Manually-added columns for a table (currently used by Stock).
 * Defined in Settings → "Extra Columns"; values are stored per-row
 * in that row's `custom_fields` jsonb, keyed by CustomColumn.key.
 */
export function useCustomColumns(tableName: string) {
  const all = useSupabaseTable<CustomColumn>('custom_columns', 'sort_order', true);
  return {
    ...all,
    rows: all.rows.filter((c) => c.table_name === tableName)
  };
}
