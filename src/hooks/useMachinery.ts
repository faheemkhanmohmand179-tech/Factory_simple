import { useSupabaseTable } from './useSupabaseTable';
import type { Machinery, Maintenance } from '../types';

/** Machinery + maintenance log */
export function useMachinery() {
  const base = useSupabaseTable<Machinery>('machinery', 'created_at', false);
  const logs = useSupabaseTable<Maintenance>('machinery_maintenance', 'log_date', false);
  return {
    ...base,
    maintenance: logs.rows,
    maintenanceLoading: logs.loading,
    refreshMaintenance: logs.refresh,
    insertMaintenance: logs.insert,
    updateMaintenance: logs.update,
    removeMaintenance: logs.remove
  };
}
