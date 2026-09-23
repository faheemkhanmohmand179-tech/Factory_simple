import { useSupabaseTable } from './useSupabaseTable';
import type { MarbleType } from '../types';

export function useMarbleTypes() {
  return useSupabaseTable<MarbleType>('marble_types', 'created_at', false);
}
