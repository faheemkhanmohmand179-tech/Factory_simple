import { useSupabaseTable } from './useSupabaseTable';
import type { MarbleSize } from '../types';

export function useMarbleSizes() {
  return useSupabaseTable<MarbleSize>('marble_sizes', 'label', true);
}
