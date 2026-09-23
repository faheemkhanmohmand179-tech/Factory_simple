import { useSupabaseTable } from './useSupabaseTable';
import type { Customer } from '../types';

export function useCustomers() {
  return useSupabaseTable<Customer>('customers', 'created_at', false);
}
