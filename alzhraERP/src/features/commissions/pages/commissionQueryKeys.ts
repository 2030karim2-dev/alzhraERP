export const commissionQueryKeys = {
  plans: (companyId: string | undefined) => ['commission-plans', companyId] as const,
  periods: (companyId: string | undefined) => ['commission-periods', companyId] as const,
  pending: (companyId: string | undefined) => ['commission-pending', companyId] as const,
  calculations: (companyId: string | undefined, periodId: string | undefined) => ['commission-calculations', companyId, periodId] as const,
  rules: (companyId: string | undefined, planId: string | undefined) => ['commission-rules', companyId, planId] as const,
  tiers: (companyId: string | undefined, planId: string | undefined) => ['commission-tiers', companyId, planId] as const,
  reportPeriods: (companyId: string | undefined) => ['commission-report-periods', companyId] as const,
  reportCalculations: (companyId: string | undefined, periodId: string | undefined) => ['commission-report-calculations', companyId, periodId] as const,
};
