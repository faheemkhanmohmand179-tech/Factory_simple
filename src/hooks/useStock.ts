import { useSupabaseTable } from './useSupabaseTable';
import type { StockItem } from '../types';

export function useStock() {
  return useSupabaseTable<StockItem>('stock', 'updated_at', false);
}
