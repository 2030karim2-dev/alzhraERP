import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Crown, ChevronRight, ChevronLeft } from 'lucide-react';
import type { AdminUser } from '../../types';
import { useAdminUsers, useUserMutations } from '../../hooks/useAdminData';
import Button from '../../../../ui/base/Button';
import { useAuthStore } from '../../../auth/store';
import { useDebounce } from '../../../../lib/hooks/useDebounce';
import { ConfirmModal } from '../../../../ui/base/ConfirmModal';

const PAGE_SIZE = 25;

export const GlobalUsersDirectory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [targetUserToToggle, setTargetUserToToggle] = useState<AdminUser | null>(null);
  const { user: currentUser } = useAuthStore();

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

  const handleConfirmToggle = async () => {
    if (!targetUserToToggle) return;
    const nextState = !targetUserToToggle.is_super_admin;
    await toggleSuperAdmin({
      userId: targetUserToToggle.user_id,
      makeSuperAdmin: nextState,
    });
    setTargetUserToToggle(null);
  };

  return (
    <div className="space-y-3">
      {/* Search and Top Bar */}
      <div className="flex flex-col items-center justify-between gap-2.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-2.5 shadow-xs sm:flex-row">
        <div className="relative w-full sm:w-80">
          <Search className="absolute right-3 top-2.5 text-[var(--app-text-secondary)]" size={14} />
          <input
            type="text"
            placeholder="بحث بالبريد الإلكتروني..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] py-1.5 pe-3 ps-9 text-xs text-[var(--app-text)] placeholder:text-[var(--app-text-secondary)] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs"
            title="تحديث البيانات"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
            <span>تحديث</span>
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-[var(--app-border)] bg-[var(--app-surface-hover)] text-[10px] font-black uppercase text-[var(--app-text-secondary)]">
                <th className="px-3.5 py-2.5">المستخدم</th>
                <th className="px-3.5 py-2.5">الرتبة في المنصة</th>
                <th className="px-3.5 py-2.5">المنشآت التابع لها</th>
                <th className="px-3.5 py-2.5">تاريخ التسجيل</th>
                <th className="px-3.5 py-2.5 text-left">إدارة الصلاحيات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--app-border)]">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-12 text-center text-xs text-[var(--app-text-secondary)]"
                  >
                    جاري تحميل سجلات المستخدمين...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs font-bold text-rose-500">
                    تعذر تحميل سجل المستخدمين. يرجى التحقق من الاتصال ثم إعادة المحاولة.
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-12 text-center text-xs text-[var(--app-text-secondary)]"
                  >
                    لا يوجد مستخدمين مطابقين لمعايير البحث.
                  </td>
                </tr>
              ) : (
                users.map(item => {
                  const isCurrent = item.user_id === currentUser?.id;
                  return (
                    <tr
                      key={item.user_id}
                      className="hover:bg-[var(--app-surface-hover)]/60 transition-colors"
                    >
                      {/* Email */}
                      <td className="px-3.5 py-2.5 font-mono">
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                              item.is_super_admin
                                ? 'border border-rose-500/20 bg-rose-500/10 text-rose-600'
                                : 'bg-indigo-500/10 text-indigo-600'
                            }`}
                          >
                            {item.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-[var(--app-text)]">{item.email}</p>
                            {isCurrent && (
                              <span className="text-[10px] font-bold text-blue-500">
                                (حسابك الحالي)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Rank */}
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

                      {/* Companies */}
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

                      {/* Created At */}
                      <td className="px-3.5 py-2.5 font-mono text-[11px] text-[var(--app-text-secondary)]">
                        {new Date(item.created_at).toLocaleDateString('ar-SA')}
                      </td>

                      {/* Actions */}
                      <td className="px-3.5 py-2.5 text-left">
                        {isCurrent ? (
                          <span className="text-[10px] italic text-[var(--app-text-secondary)]">
                            غير قابل للتعديل
                          </span>
                        ) : (
                          <Button
                            variant={item.is_super_admin ? 'danger' : 'outline'}
                            onClick={() => setTargetUserToToggle(item)}
                            disabled={isTogglingSuperAdmin}
                            className="px-2.5 py-1 text-[10px] font-bold"
                          >
                            {item.is_super_admin ? 'سحب صلاحية الأدمن' : 'ترقية لسوبر أدمن'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-[var(--app-border)] bg-[var(--app-surface-hover)] px-3.5 py-2 text-xs">
          <span className="text-[10px] text-[var(--app-text-secondary)]">
            عرض {users.length} مستخدم (صفحة {page})
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
              disabled={users.length < PAGE_SIZE || isLoading}
              onClick={() => setPage(p => p + 1)}
              className="flex items-center gap-1 px-2 py-1 text-[10px]"
            >
              <span>التالي</span>
              <ChevronLeft size={12} />
            </Button>
          </div>
        </div>
      </div>

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
        onClose={() => setTargetUserToToggle(null)}
        onConfirm={handleConfirmToggle}
      />
    </div>
  );
};
