import { useSupabaseTable } from './useSupabaseTable';
import type { Expense } from '../types';

export function useExpenses() {
  return useSupabaseTable<Expense>('expenses', 'expense_date', false);
}
