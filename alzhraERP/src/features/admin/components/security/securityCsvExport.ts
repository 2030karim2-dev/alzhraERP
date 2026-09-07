import {
  fetchAllAdminCspReports,
  fetchAllAdminSecurityAlerts,
  type SecurityStatusFilter,
} from '../../hooks/useAdminData';
import { downloadCsvFile, toCsv } from '../../utils';

/** يصدّر كل تقارير CSP (تجاوز الصفحة المعروضة — حد 200 خادمياً/استدعاء). */
export const exportCspReportsCsv = async (): Promise<void> => {
  const stamp = new Date().toISOString().slice(0, 10);
  const allReports = await fetchAllAdminCspReports();
  const header = [
    'معرف التقرير',
    'الصفحة المستهدفة',
    'المورد المحظور',
    'القاعدة المنتهكة',
    'توقيت الاستلام',
  ];
  const rows = allReports.map(report => [
    report.id,
    report.document_uri ?? '',
    report.blocked_uri ?? '',
    report.violated_directive ?? '',
    report.received_at !== '' ? new Date(report.received_at).toLocaleString('ar-SA') : '',
  ]);
  downloadCsvFile(`csp-reports-all-${stamp}.csv`, toCsv(header, rows));
};

/** يصدّر كل تنبيهات الأمان وفق فلتر حالة المعالجة (الكل/قيد المعالجة/المعالجة). */
export const exportAlertsCsv = async (statusFilter: SecurityStatusFilter): Promise<void> => {
  const stamp = new Date().toISOString().slice(0, 10);
  const resolved =
    statusFilter === 'unresolved' ? false : statusFilter === 'resolved' ? true : undefined;
  const allAlerts = await fetchAllAdminSecurityAlerts(resolved);
  const header = [
    'معرف التنبيه',
    'المستوى',
    'نوع التنبيه',
    'عنوان IP',
    'وكيل المستخدم',
    'معرف المستخدم',
    'معرف المنشأة',
    'التفاصيل الفنية',
    'وقت الاكتشاف',
    'تمت المعالجة',
    'تاريخ المعالجة',
    'المسؤول عن المعالجة',
    'ملاحظات المعالجة',
  ];
  const rows = allAlerts.map(log => [
    log.id,
    log.severity,
    log.alert_type,
    log.source_ip ?? '',
    log.user_agent ?? '',
    log.user_id ?? '',
    log.company_id ?? '',
    JSON.stringify(log.details ?? {}),
    new Date(log.detected_at).toLocaleString('ar-SA'),
    log.resolved_at !== null && log.resolved_at !== '' ? 'نعم' : 'لا',
    log.resolved_at !== null && log.resolved_at !== ''
      ? new Date(log.resolved_at).toLocaleString('ar-SA')
      : '',
    log.resolved_by ?? '',
    log.resolution_notes ?? '',
  ]);
  downloadCsvFile(`security-alerts-all-${stamp}.csv`, toCsv(header, rows));
};
