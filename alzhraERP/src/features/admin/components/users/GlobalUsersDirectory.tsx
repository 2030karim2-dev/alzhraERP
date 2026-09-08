import React, { useState, useEffect } from 'react';
import { RefreshCw, Crown, Download, AlertTriangle } from 'lucide-react';
import type { AdminUser } from '../../types';
import {
  useAdminUsers,
  useAdminUsersCount,
  useUserMutations,
  useSuperAdminCount,
  ADMIN_TABLE_PAGE_SIZE,
  fetchAllAdminUsers,
} from '../../hooks/useAdminData';
import { downloadCsvFile, toCsv } from '../../utils';
import { AdminTableShell } from '../shared/AdminTableShell';
import Button from '../../../../ui/base/Button';
import { useAuthStore } from '../../../auth/store';
import { useDebounce } from '../../../../lib/hooks/useDebounce';
import { ConfirmModal } from '../../../../ui/base/ConfirmModal';
import { useFeedbackStore } from '../../../feedback/store';

const PAGE_SIZE = ADMIN_TABLE_PAGE_SIZE;

export const GlobalUsersDirectory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [targetUserToToggle, setTargetUserToToggle] = useState<AdminUser | null>(null);
  const { user: currentUser } = useAuthStore();
  const { showToast } = useFeedbackStore();

  const debouncedSearch = useDebounce(searchTerm, 400);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const {
    data: users = [],
    isLoading,
    isError,
    refetch,
  } = useAdminUsers({
    search: debouncedSearch.trim() || undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const { toggleSuperAdmin, isTogglingSuperAdmin } = useUserMutations();
  const { data: totalUsers = 0 } = useAdminUsersCount(debouncedSearch.trim() || undefined);
  const { data: superAdminCount } = useSuperAdminCount();
  const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));

  // منع البقاء في صفحة فارغة إذا تقلص عدد النتائج (سحب صلاحية مثلاً) دون تغيير الصفحة
  useEffect(() => {
    if (!isLoading && page > totalPages) {
      setPage(totalPages);
    }
  }, [isLoading, page, totalPages]);

  const handleConfirmToggle = async () => {
    if (!targetUserToToggle) return;
    const nextState = !targetUserToToggle.is_super_admin;
    try {
      await toggleSuperAdmin({
        userId: targetUserToToggle.user_id,
        makeSuperAdmin: nextState,
      });
    } finally {
      setTargetUserToToggle(null);
    }
  };

  const handleExportCsv = async () => {
    if (isExportingCsv) return;
    setIsExportingCsv(true);
    try {
      // تصدير كامل لكل المستخدمين المطابقين للبحث (لا صفحة العرض فقط)
      const allUsers = await fetchAllAdminUsers(debouncedSearch.trim() || undefined);
      const header = ['البريد الإلكتروني', 'سوبر أدمن', 'عدد المنشآت', 'المنشآت', 'تاريخ التسجيل'];
      const rows = allUsers.map(u => [
        u.email,
        u.is_super_admin ? 'نعم' : 'لا',
        u.companies_count,
        u.company_names.join(' | '),
        new Date(u.created_at).toLocaleDateString('ar-SA'),
      ]);
      downloadCsvFile('users-all.csv', toCsv(header, rows));
    } catch {
      showToast('تعذر تصدير دليل المستخدمين. تحقق من الاتصال وحاول مجدداً.', 'error');
    } finally {
      setIsExportingCsv(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* إنذار تشغيلي: سوبر أدمن وحيد، فقدان الحساب الوحيد يترك المنصة بلا إدارة */}
      {superAdminCount === 1 && (
        <div
          className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-amber-700 dark:text-amber-400"
          role="alert"
        >
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-black">يوجد سوبر أدمن وحيد في المنصة</p>
            <p className="mt-0.5 text-[11px] leading-relaxed">
              لا يمكن سحب صلاحيتك عن نفسك (محمية خادمياً)، لكن{' '}
              <strong className="font-black">فقدان الوصول للحساب الوحيد</strong> (كلمة مرور أو فقدان
              الجهاز) يترك المنصة بلا إدارة ويتطلب تدخلاً يدوياً. أنشئ حساباً احتياطياً ثانياً
              موثوقاً عبر «ترقية لسوبر أدمن» أدناه.
            </p>
          </div>
        </div>
      )}

      <AdminTableShell
        columns={[
          { label: 'المستخدم' },
          { label: 'الرتبة في المنصة' },
          { label: 'المنشآت التابع لها' },
          { label: 'تاريخ التسجيل' },
          { label: 'إدارة الصلاحيات', align: 'left' },
        ]}
        hasRows={users.length > 0}
        loading={isLoading}
        error={isError}
        emptyMessage="لا يوجد مستخدمين مطابقين لمعايير البحث."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="بحث بالبريد الإلكتروني..."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => void handleExportCsv()}
              disabled={isExportingCsv}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs"
              title="تصدير كل المستخدمين المطابقين للبحث CSV"
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
          itemCount: users.length,
          totalItems: totalUsers,
          itemLabel: 'مستخدم',
          isLoading,
          onPrev: () => {
            setPage(p => Math.max(1, p - 1));
          },
          onNext: () => {
            setPage(p => p + 1);
          },
        }}
      >
        {users.map(item => {
          const isCurrent = item.user_id === currentUser?.id;
          return (
            <tr
              key={item.user_id}
              className="hover:bg-[var(--app-surface-hover)]/60 transition-colors"
            >
              <td className="px-3.5 py-2.5 font-mono">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                      item.is_super_admin
                        ? 'border border-rose-500/20 bg-rose-500/10 text-rose-600'
                        : 'border border-[var(--app-border)] bg-[var(--app-surface-hover)] text-[var(--app-text)]'
                    }`}
                  >
                    {item.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-[var(--app-text)]">{item.email}</p>
                    {isCurrent && (
                      <span className="text-[10px] font-bold text-blue-500">(حسابك الحالي)</span>
                    )}
                  </div>
                </div>
              </td>

              <td className="px-3.5 py-2.5">
                {item.is_super_admin ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10px] font-black text-rose-600">
                    <Crown size={11} />
                    <span>Super Admin</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-bold text-[var(--app-text-secondary)]">
                    <span>مستخدم منشأة</span>
                  </span>
                )}
              </td>

              <td className="px-3.5 py-2.5">
                <div className="flex max-w-xs flex-wrap gap-1">
                  {(item.company_names || []).length > 0 ? (
                    item.company_names.map((cName, idx) => (
                      <span
                        key={idx}
                        className="max-w-[120px] truncate rounded-md border border-[var(--app-border)] bg-[var(--app-surface-hover)] px-1.5 py-0.5 text-[10px] text-[var(--app-text)]"
                      >
                        {cName}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] italic text-[var(--app-text-secondary)]">
                      بلا منشأة مرتبطة
                    </span>
                  )}
                </div>
              </td>

              <td className="px-3.5 py-2.5 font-mono text-[11px] text-[var(--app-text-secondary)]">
                {new Date(item.created_at).toLocaleDateString('ar-SA')}
              </td>

              <td className="px-3.5 py-2.5 text-left">
                {isCurrent ? (
                  <span className="text-[10px] italic text-[var(--app-text-secondary)]">
                    غير قابل للتعديل
                  </span>
                ) : (
                  <Button
                    variant={item.is_super_admin ? 'danger' : 'outline'}
                    onClick={() => {
                      setTargetUserToToggle(item);
                    }}
                    disabled={isTogglingSuperAdmin}
                    className="px-2.5 py-1 text-xs font-bold"
                  >
                    {item.is_super_admin ? 'سحب صلاحية الأدمن' : 'ترقية لسوبر أدمن'}
                  </Button>
                )}
              </td>
            </tr>
          );
        })}
      </AdminTableShell>
      {/* Confirm Toggle Super Admin Modal */}
      <ConfirmModal
        isOpen={!!targetUserToToggle}
        title={
          targetUserToToggle?.is_super_admin ? 'سحب صلاحية السوبر أدمن' : 'ترقية إلى سوبر أدمن'
        }
        message={
          targetUserToToggle?.is_super_admin
            ? `هل أنت متأكد من سحب صلاحية السوبر أدمن من المستخدم [${targetUserToToggle.email}]؟ سيفقد حق الوصول لمركز تحكم المنصة.`
            : `هل أنت متأكد من ترقية المستخدم [${targetUserToToggle?.email || ''}] إلى سوبر أدمن؟ سيمنح هذا الحساب صلاحيات كاملة ومطلقة على كافة الشركات والبيانات.`
        }
        variant={targetUserToToggle?.is_super_admin ? 'danger' : 'warning'}
        confirmLabel={targetUserToToggle?.is_super_admin ? 'تأكيد السحب' : 'تأكيد الترقية'}
        isLoading={isTogglingSuperAdmin}
        onClose={() => {
          setTargetUserToToggle(null);
        }}
        onConfirm={handleConfirmToggle}
      />
    </div>
  );
};
