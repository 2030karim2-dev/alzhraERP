import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Ban,
  Download,
  Eye,
  Filter,
  RefreshCw,
} from 'lucide-react';
import type { AdminCompany } from '../../types';
import {
  useAdminCompanies,
  useAdminCompaniesCount,
  useCompanyMutations,
  ADMIN_TABLE_PAGE_SIZE,
  fetchAllAdminCompanies,
} from '../../hooks/useAdminData';
import { CompanyDetailsModal } from './CompanyDetailsModal';
import { companyStatusLabel, deriveStatusAfterToggle, downloadCsvFile, toCsv } from '../../utils';
import { AdminTableShell } from '../shared/AdminTableShell';
import Button from '../../../../ui/base/Button';
import { useDebounce } from '../../../../lib/hooks/useDebounce';
import { ConfirmModal } from '../../../../ui/base/ConfirmModal';
import { useFeedbackStore } from '../../../feedback/store';

const PAGE_SIZE = ADMIN_TABLE_PAGE_SIZE;

const CompanyStatusBadge: React.FC<{ company: AdminCompany }> = ({ company }) => {
  const label = companyStatusLabel(company);
  if (!company.is_active) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
        <Ban size={10} />
        <span>{label}</span>
      </span>
    );
  }

  if (company.subscription_status === 'past_due') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
        <AlertTriangle size={10} />
        <span>{label}</span>
      </span>
    );
  }

  if (company.subscription_status === 'cancelled') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
        <Ban size={10} />
        <span>{label}</span>
      </span>
    );
  }

  if (company.subscription_status === 'trial') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-600 dark:text-sky-400">
        <Clock size={10} />
        <span>{label}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
      <CheckCircle2 size={10} />
      <span>{label}</span>
    </span>
  );
};
export const CompaniesTable: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCompany, setSelectedCompany] = useState<AdminCompany | null>(null);
  const [page, setPage] = useState(1);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
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
  const { showToast } = useFeedbackStore();
  const { data: totalCompanies = 0 } = useAdminCompaniesCount({
    search: debouncedSearch.trim() || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });
  const totalPages = Math.max(1, Math.ceil(totalCompanies / PAGE_SIZE));

  // منع البقاء في صفحة فارغة إذا تقلص عدد النتائج (تعليق منشأة مثلاً) دون تغيير الصفحة
  useEffect(() => {
    if (!isLoading && page > totalPages) {
      setPage(totalPages);
    }
  }, [isLoading, page, totalPages]);

  const handleToggleClick = (company: AdminCompany) => {
    const nextActive = !company.is_active;
    const actionLabel = nextActive ? 'إعادة تفعيل' : 'تعليق';
    // الحالة المحسوبة تطابق منطق الخادم (20260904000001 مع تحسين 20260904000009)؛ الخادم هو مصدر الحقيقة
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

  const handleExportCsv = async () => {
    if (isExportingCsv) return;
    setIsExportingCsv(true);
    try {
      // تصدير كامل: يجلب كل النتائج المطابقة للفلاتر الحالية (لا صفحة العرض فقط)
      const allCompanies = await fetchAllAdminCompanies({
        search: debouncedSearch.trim() || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
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
      const rows = allCompanies.map(c => [
        c.name_ar,
        c.tax_number ?? '',
        c.owner_email ?? '',
        c.plan_name ?? '',
        companyStatusLabel(c),
        c.user_count,
        c.branch_count,
        c.invoice_count,
        c.created_at ? new Date(c.created_at).toLocaleDateString('ar-SA') : '',
      ]);
      downloadCsvFile('companies-all.csv', toCsv(header, rows));
    } catch {
      showToast('تعذر تصدير قائمة المنشآت. تحقق من الاتصال وحاول مجدداً.', 'error');
    } finally {
      setIsExportingCsv(false);
    }
  };

  return (
    <div className="space-y-3">
      <AdminTableShell
        columns={[
          { label: 'المنشأة' },
          { label: 'الرقم الضريبي' },
          { label: 'المالك' },
          { label: 'الباقة' },
          { label: 'المستخدمون/الفروع', align: 'center' },
          { label: 'الفواتير', align: 'center' },
          { label: 'الحالة' },
          { label: 'الإجراءات', align: 'left' },
        ]}
        hasRows={companies.length > 0}
        loading={isLoading}
        error={isError}
        emptyMessage="لا توجد منشآت مطابقة لمعايير البحث."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="بحث بالاسم أو البريد..."
        actions={
          <>
            <div className="flex items-center gap-1.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2 py-1.5">
              <Filter size={12} className="text-[var(--app-text-secondary)]" />
              <select
                value={statusFilter}
                onChange={e => {
                  setStatusFilter(e.target.value);
                }}
                aria-label="تصفية حسب الحالة"
                className="bg-transparent text-xs text-[var(--app-text)] focus:outline-none"
              >
                <option value="all">كل الحالات</option>
                <option value="active">نشطة</option>
                <option value="trial">تجريبية</option>
                <option value="past_due">متأخرة السداد</option>
                <option value="cancelled">ملغاة</option>
                <option value="suspended">موقوفة</option>
              </select>
            </div>
            <Button
              variant="outline"
              onClick={() => void handleExportCsv()}
              disabled={isExportingCsv}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs"
              title="تصدير كل المنشآت المطابقة للفلاتر CSV"
            >
              <Download size={12} className={isExportingCsv ? 'animate-pulse' : ''} />
              <span className="hidden sm:inline">
                {isExportingCsv ? 'جاري التصدير...' : 'تصدير الكل CSV'}
              </span>
            </Button>
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs"
              title="تحديث البيانات"
            >
              <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
              <span>تحديث</span>
            </Button>
          </>
        }
        pagination={{
          page,
          totalPages,
          itemCount: companies.length,
          totalItems: totalCompanies,
          itemLabel: 'منشأة',
          isLoading,
          onPrev: () => {
            setPage(p => Math.max(1, p - 1));
          },
          onNext: () => {
            setPage(p => p + 1);
          },
        }}
      >
        {companies.map(company => (
          <tr key={company.id} className="hover:bg-[var(--app-surface-hover)]/60 transition-colors">
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
              <span className="text-indigo-600 dark:text-indigo-400">{company.user_count}</span>
              <span className="mx-1 text-[var(--app-text-secondary)]">/</span>
              <span className="text-blue-600 dark:text-blue-400">{company.branch_count}</span>
            </td>

            {/* Invoices */}
            <td className="px-3.5 py-2.5 text-center font-bold text-emerald-600 dark:text-emerald-400">
              {company.invoice_count}
            </td>

            {/* Status */}
            <td className="px-3.5 py-2.5">
              <CompanyStatusBadge company={company} />
            </td>

            {/* Actions */}
            <td className="px-3.5 py-2.5 text-left">
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => {
                    setSelectedCompany(company);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--app-border)] text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-surface-hover)] hover:text-blue-600"
                  title="عرض التفاصيل الكاملة"
                >
                  <Eye size={13} />
                </button>
                <button
                  disabled={isToggling}
                  onClick={() => {
                    handleToggleClick(company);
                  }}
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
        ))}
      </AdminTableShell>
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
        onClose={() => {
          setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        }}
        onConfirm={confirmModalState.action}
      />
    </div>
  );
};
