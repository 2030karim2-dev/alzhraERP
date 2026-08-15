import type { CommissionCalculation } from '../types';
import { calculationStatusLabels } from './commissionLabels';

function csvCell(value: unknown): string {
  const text = typeof value === 'string' ? value : typeof value === 'number' || typeof value === 'boolean' ? value.toString() : '';
  return `"${text.split('"').join('""')}"`;
}

export function downloadCommissionCsv(rows: CommissionCalculation[]): void {
  const header = ['الموظف', 'المبيعات الصافية', 'المحصل', 'عدد الفواتير', 'إجمالي العمولة', 'الحالة'];
  const body = rows.map(row => [row.user_id, row.net_sales, row.collected_amount, row.invoice_count, row.total_commission, calculationStatusLabels[row.status]].map(csvCell).join(','));
  const blob = new Blob([`\uFEFF${[header.map(csvCell).join(','), ...body].join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'commission-report.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}
