import { useSupabaseTable } from './useSupabaseTable';
import type { Labour, WagePayment } from '../types';

/** Labour list + wage payments */
export function useLabour() {
  const base = useSupabaseTable<Labour>('labour', 'created_at', false);
  const payments = useSupabaseTable<WagePayment>('wage_payments', 'created_at', false);
  return { ...base, payments: payments.rows, paymentsLoading: payments.loading, refreshPayments: payments.refresh };
}
