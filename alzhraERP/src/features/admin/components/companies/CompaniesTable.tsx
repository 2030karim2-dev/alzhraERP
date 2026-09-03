import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  Ban,
  Download,
  Eye,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import type { AdminCompany } from '../../types';
import { useAdminCompanies, useAdminCompaniesCount, useCompanyMutations } from '../../hooks/useAdminData';
import { CompanyDetailsModal } from './CompanyDetailsModal';
import {
  deriveStatusAfterToggle,
  downloadCsvFile,
  subscriptionStatusLabel,
  toCsv,
} from '../../utils';
import Button from '../../../../ui/base/Button';
import { useDebounce } from '../../../../lib/hooks/useDebounce';
import { ConfirmModal } from '../../../../ui/base/ConfirmModal';

const PAGE_SIZE = 25;

export const CompaniesTable: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCompany, setSelectedCompany] = useState<AdminCompany | null>(null);
  const [page, setPage] = useState(1);
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
    variant: 'danger' | 'warning' | 'primary';
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: async () => {},
    variant: 'primary',
  });

  const debouncedSearch = useDebounce(searchTerm, 400);

  // Reset page when search or filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const queryParams: {
    search?: string | undefined;
    status?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  } = {
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };

  if (debouncedSearch.trim()) queryParams.search = debouncedSearch.trim();
  if (statusFilter !== 'all') queryParams.status = statusFilter;

  const { data: companies = [], isLoading, isError, refetch } = useAdminCompanies(queryParams);
  const { toggleStatus, isToggling } = useCompanyMutations();
  const { data: totalCompanies = 0 } = useAdminCompaniesCount({
    search: debouncedSearch.trim() || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });
  const totalPages = Math.max(1, Math.ceil(totalCompanies / PAGE_SIZE));

  const handleToggleClick = (company: AdminCompany) => {
    const nextActive = !company.is_active;
    const actionLabel = nextActive ? 'إعادة تفعيل' : 'تعليق';
    // الحالة المحسوبة تطابق منطق الخادم (20260904000001)؛ الخادم هو مصدر الحقيقة
    const nextStatus = deriveStatusAfterToggle(company, nextActive);

    setConfirmModalState({
      isOpen: true,
      title: `${actionLabel} المنشأة`,
      message: `هل أنت متأكد من ${actionLabel} منشأة "${company.name_ar}"؟ ${
        !nextActive
          ? 'سيتم حجب وصول مستخدمي هذه المنشأة فوراً.'
          : 'سيتمكن مستخدمو المنشأة من متابعة العمل.'
      }`,
      variant: nextActive ? 'primary' : 'danger',
      action: async () => {
        try {
          await toggleStatus({
            companyId: company.id,
            isActive: nextActive,
            status: nextStatus,
          });
          setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        } catch {
          // onError في الـ hook يعرض التوست؛ نُبقي المودال مفتوحاً لإعادة المحاولة
        }
      },
    });
  };

  const handleExportCsv = () => {
    const header = [
      'المنشأة',
      'الرقم الضريبي',
      'بريد المالك',
      'الباقة',
      'الحالة',
      'المستخدمون',
      'الفروع',
      'الفواتير',
      'تاريخ التسجيل',
    ];
    const rows = companies.map(c => [
      c.name_ar,
      c.tax_number ?? '',
      c.owner_email ?? '',
      c.plan_name ?? '',
      c.is_active ? c.subscription_status : 'suspended',
      c.user_count,
      c.branch_count,
      c.invoice_count,
      c.created_at ? new Date(c.created_at).toLocaleDateString('ar-SA') : '',
    ]);
    downloadCsvFile(`companies-page-${page}.csv`, toCsv(header, rows));
  };

  return (
    <div className="space-y-3">
      {/* Search and Filters Bar */}
      <div className="flex flex-col items-center justify-between gap-2.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-2.5 shadow-xs sm:flex-row">
        <div className="relative w-full sm:w-80">
          <Search className="absolute right-3 top-2.5 text-[var(--app-text-secondary)]" size={14} />
          <input
            type="text"
            placeholder="بحث بالاسم، الرقم الضريبي، بريد المالك..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] py-1.5 pe-3 ps-9 text-xs text-[var(--app-text)] placeholder:text-[var(--app-text-secondary)] focus:outline-none focus:ring-1 focus:ring-blue-500/30"
          />
        </div>

        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-[var(--app-text-secondary)]" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2.5 py-1.5 text-xs text-[var(--app-text)] focus:outline-none"
            >
              <option value="all">كافة الحالات</option>
              <option value="active">نشطة (Active)</option>
              <option value="trial">تجريبية (Trial)</option>
              <option value="suspended">معلقة (Suspended)</option>
              <option value="past_due">متأخرة السداد (Past Due)</option>
              <option value="cancelled">ملغاة (Cancelled)</option>
            </select>
          </div>

          <Button
            variant="outline"
            onClick={handleExportCsv}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs"
            title="تصدير نتائج هذه الصفحة CSV"
          >
            <Download size={12} />
            <span className="hidden sm:inline">تصدير CSV</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => refetch()}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs"
            title="تحديث البيانات"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">تحديث</span>
          </Button>
        </div>
      </div>

      {/* High-Density Companies Table */}
      <div className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-[var(--app-border)] bg-[var(--app-surface-hover)] text-[10px] font-black uppercase text-[var(--app-text-secondary)]">
                <th className="px-3.5 py-2.5">المنشأة</th>
                <th className="px-3.5 py-2.5">الرقم الضريبي</th>
                <th className="px-3.5 py-2.5">المالك</th>
                <th className="px-3.5 py-2.5">الباقة</th>
                <th className="px-3.5 py-2.5 text-center">المستخدمين / الفروع</th>
                <th className="px-3.5 py-2.5 text-center">الفواتير</th>
                <th className="px-3.5 py-2.5">الحالة</th>
                <th className="px-3.5 py-2.5 text-left">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--app-border)]">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-12 text-center text-xs text-[var(--app-text-secondary)]"
                  >
                    جاري تحميل سجلات المنشآت...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs font-bold text-rose-500">
                    تعذر تحميل قائمة المنشآت. يرجى التحقق من الاتصال ثم إعادة المحاولة.
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-12 text-center text-xs text-[var(--app-text-secondary)]"
                  >
                    لا توجد منشآت مطابقة لمعايير البحث.
                  </td>
                </tr>
              ) : (
                companies.map(company => (
                  <tr
                    key={company.id}
                    className="hover:bg-[var(--app-surface-hover)]/60 transition-colors"
                  >
                    {/* Name */}
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-xs font-bold text-blue-600">
                          {company.name_ar.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-[var(--app-text)]">{company.name_ar}</p>
                          <span className="font-mono text-[10px] text-[var(--app-text-secondary)]">
                            {company.base_currency}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Tax */}
                    <td className="px-3.5 py-2.5 font-mono text-[11px] text-[var(--app-text-secondary)]">
                      {company.tax_number || '—'}
                    </td>

                    {/* Owner */}
                    <td className="px-3.5 py-2.5">
                      <p className="max-w-[140px] truncate font-mono text-[11px] text-[var(--app-text)]">
                        {company.owner_email || 'غير مسجل'}
                      </p>
                    </td>

                    {/* Plan */}
                    <td className="px-3.5 py-2.5">
                      <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-black text-blue-600 dark:text-blue-400">
                        {company.plan_name || 'أساسية'}
                      </span>
                    </td>

                    {/* Users / Branches */}
                    <td className="px-3.5 py-2.5 text-center font-bold">
                      <span className="text-indigo-600 dark:text-indigo-400">
                        {company.user_count}
                      </span>
                      <span className="mx-1 text-[var(--app-text-secondary)]">/</span>
                      <span className="text-blue-600 dark:text-blue-400">
                        {company.branch_count}
                      </span>
                    </td>

                    {/* Invoices */}
                    <td className="px-3.5 py-2.5 text-center font-bold text-emerald-600 dark:text-emerald-400">
                      {company.invoice_count}
                    </td>

                    {/* Status */}
                    <td className="px-3.5 py-2.5">
                      {company.is_active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                          <CheckCircle2 size={10} />
                          <span>
                            {subscriptionStatusLabel(company.subscription_status)}
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                          <Ban size={10} />
                          <span>معلق</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-3.5 py-2.5 text-left">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedCompany(company)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--app-border)] text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-surface-hover)] hover:text-blue-600"
                          title="عرض التفاصيل الكاملة"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          disabled={isToggling}
                          onClick={() => handleToggleClick(company)}
                          className={`flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--app-border)] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                            company.is_active
                              ? 'text-rose-500 hover:bg-rose-500/10'
                              : 'text-emerald-500 hover:bg-emerald-500/10'
                          }`}
                          title={company.is_active ? 'تعليق حساب الشركة' : 'إعادة تفعيل الشركة'}
                        >
                          {company.is_active ? <Ban size={13} /> : <CheckCircle2 size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-[var(--app-border)] bg-[var(--app-surface-hover)] px-3.5 py-2 text-xs">
          <span className="text-[10px] text-[var(--app-text-secondary)]">
            عرض {companies.length} من {totalCompanies} منشأة (صفحة {page} من {totalPages})
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="flex items-center gap-1 px-2 py-1 text-[10px]"
            >
              <ChevronRight size={12} />
              <span>السابق</span>
            </Button>
            <span className="px-2 text-[10px] font-bold text-[var(--app-text)]">{page}</span>
            <Button
              variant="outline"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage(p => p + 1)}
              className="flex items-center gap-1 px-2 py-1 text-[10px]"
            >
              <span>التالي</span>
              <ChevronLeft size={12} />
            </Button>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {selectedCompany && (
        <CompanyDetailsModal
          company={selectedCompany}
          onClose={() => {
            setSelectedCompany(null);
            refetch();
          }}
        />
      )}

      {/* Confirm Action Modal */}
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        title={confirmModalState.title}
        message={confirmModalState.message}
        variant={confirmModalState.variant}
        isLoading={isToggling}
        onClose={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModalState.action}
      />
    </div>
  );
};
