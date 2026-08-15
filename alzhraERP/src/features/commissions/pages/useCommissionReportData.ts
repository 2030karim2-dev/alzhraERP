import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../auth/store';
import type { AuthUser } from '../../auth/types';
import { listCommissionCalculations, listCommissionPeriods } from '../api';

export function useCommissionReportData(): {
  companyId?: string;
  periods: Awaited<ReturnType<typeof listCommissionPeriods>>;
  period?: Awaited<ReturnType<typeof listCommissionPeriods>>[number];
  rows: Awaited<ReturnType<typeof listCommissionCalculations>>;
  totals: { commission: number; sales: number; collected: number };
  setSelectedPeriodId: (id: string | undefined) => void;
} {
  const user: AuthUser | null = useAuthStore(state => state.user);
  const companyId = user?.company_id;
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | undefined>(undefined);
  const periodsQuery = useQuery({
    queryKey: ['commission-report-periods', companyId],
    queryFn: () => (companyId !== undefined && companyId.length > 0 ? listCommissionPeriods(companyId) : Promise.resolve([])),
    enabled: typeof companyId === 'string',
  });
  const periods = useMemo(() => periodsQuery.data ?? [], [periodsQuery.data]);
  const period = periods.find(item => item.id === selectedPeriodId) ?? periods.at(0);
  const calculationsQuery = useQuery({
    queryKey: ['commission-report-calculations', companyId, period?.id],
    queryFn: () => (companyId !== undefined && companyId.length > 0 && period !== undefined ? listCommissionCalculations(companyId, period.id) : Promise.resolve([])),
    enabled: companyId !== undefined && companyId.length > 0 && period !== undefined,
  });
  const rows = useMemo(() => calculationsQuery.data ?? [], [calculationsQuery.data]);
  const totals = useMemo(() => rows.reduce((acc, row) => ({
    commission: acc.commission + row.total_commission,
    sales: acc.sales + row.net_sales,
    collected: acc.collected + row.collected_amount,
  }), { commission: 0, sales: 0, collected: 0 }), [rows]);
  return { companyId, periods, period, rows, totals, setSelectedPeriodId };
}
