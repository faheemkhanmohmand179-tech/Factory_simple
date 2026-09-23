import { useCallback } from 'react';
import { useSupabaseTable } from './useSupabaseTable';
import type { Attendance } from '../types';

/** Attendance with a smart per-labour-per-day saver (insert or update) */
export function useAttendance() {
  const base = useSupabaseTable<Attendance>('attendance', 'attendance_date', false);

  /** Save one labour's status for a date — updates the existing row if any */
  const saveAttendance = useCallback(
    async (row: { labour_id: string; labour_name: string; attendance_date: string; status: string; overtime_hours?: number; note?: string | null }) => {
      const existing = base.rows.find(
        (r) => r.labour_id === row.labour_id && r.attendance_date === row.attendance_date
      );
      if (existing) {
        await base.update(existing.id, { ...row });
      } else {
        await base.insert(row as unknown as Record<string, unknown>);
      }
    },
    [base]
  );

  return { ...base, saveAttendance };
}
