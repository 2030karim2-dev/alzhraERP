import React, { useState, useEffect } from 'react';
import { Shield, Check, RotateCcw, CheckCheck, X, Lock, GitBranch } from 'lucide-react';
import Button from '../../../../ui/base/Button';
import { cn } from '../../../../core/utils';
import { PERMISSION_CATEGORIES } from '../../../../core/permissions/permissionTaxonomy';
import {
  type CompanyMember,
  useMemberPermissions,
  useUpdateMemberPermissions,
  useUpdateMemberRoleAndBranch,
} from '../../hooks/useUserPermissions';
import { useBranches } from '../../hooks';
import { OFFLINE_ROLE_PERMISSIONS } from '../../../../core/permissions/offlineRolePermissions';
import type { Role } from '../../../../core/types/common';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  member: CompanyMember | null;
}

export const EmployeePermissionsModal: React.FC<Props> = ({ isOpen, onClose, member }) => {
  const { data: memberPerms, isLoading } = useMemberPermissions(member?.user_id || null);
  const { data: branches = [] } = useBranches();
  const updatePermissions = useUpdateMemberPermissions();
  const updateRoleAndBranch = useUpdateMemberRoleAndBranch();

  const [selectedRole, setSelectedRole] = useState<string>('staff');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [grantedPerms, setGrantedPerms] = useState<Set<string>>(new Set());

  // Initialize state when modal opens or member data changes
  useEffect(() => {
    if (member) {
      setSelectedRole(member.role || 'staff');
      setSelectedBranchId(member.branch_id || '');
    }
  }, [member]);

  useEffect(() => {
    if (memberPerms) {
      // Merge role default permissions + explicitly granted permissions
      const initial = new Set<string>();

      // Default role permissions
      const normalizedRole = (memberPerms.role === 'owner' ? 'admin' : memberPerms.role) as Role;
      const defaultList = OFFLINE_ROLE_PERMISSIONS[normalizedRole] || [];
      defaultList.forEach(p => initial.add(p));

      // Granted permissions from DB
      (memberPerms.granted_permissions || []).forEach(p => initial.add(p));

      // Remove revoked permissions
      (memberPerms.revoked_permissions || []).forEach(p => initial.delete(p));

      setGrantedPerms(initial);
    }
  }, [memberPerms]);

  if (!isOpen || !member) return null;

  const isOwner = member.role === 'owner';

  const togglePermission = (key: string) => {
    if (isOwner) return; // Owners always have all permissions
    setGrantedPerms(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (isOwner) return;
    const all = new Set<string>();
    PERMISSION_CATEGORIES.forEach(cat => {
      cat.permissions.forEach(p => all.add(p.key));
    });
    setGrantedPerms(all);
  };

  const handleClearAll = () => {
    if (isOwner) return;
    setGrantedPerms(new Set());
  };

  const handleResetToRoleDefaults = () => {
    if (isOwner) return;
    const normalized = (selectedRole === 'owner' ? 'admin' : selectedRole) as Role;
    const defaultList = OFFLINE_ROLE_PERMISSIONS[normalized] || [];
    setGrantedPerms(new Set(defaultList));
  };

  const handleSave = async () => {
    try {
      // 1. Update role and branch if changed
      if (selectedRole !== member.role || (selectedBranchId || null) !== member.branch_id) {
        await updateRoleAndBranch.mutateAsync({
          userId: member.user_id,
          role: selectedRole,
          branchId: selectedBranchId || null,
        });
      }

      // 2. Update custom permissions
      if (!isOwner) {
        const normalized = (selectedRole === 'owner' ? 'admin' : selectedRole) as Role;
        const defaultList = OFFLINE_ROLE_PERMISSIONS[normalized] || [];
        const revokedList = defaultList.filter(p => !grantedPerms.has(p));

        await updatePermissions.mutateAsync({
          targetUserId: member.user_id,
          grantedPermissions: Array.from(grantedPerms),
          revokedPermissions: revokedList,
        });
      }

      onClose();
    } catch (err) {
      // Error handled by mutation toast
    }
  };

  const isSaving = updatePermissions.isPending || updateRoleAndBranch.isPending;

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm duration-200">
      <div
        className="animate-in zoom-in-95 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-gray-100 bg-[var(--app-surface)] shadow-2xl duration-200 dark:border-slate-800"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-gray-50/50 p-5 dark:border-slate-800 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-600 p-2.5 text-white shadow-lg shadow-blue-500/20">
              <Shield size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-gray-900 dark:text-slate-100">
                  تخصيص صلاحيات الموظف: {member.profile?.full_name || 'موظف'}
                </h3>
                {isOwner && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    👑 مالك النظام (كامل الصلاحيات)
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-gray-500 dark:text-slate-400">
                تحديد الدور الوظيفي، الفرع التابع له، والتحكم الفردي في كل صلاحية
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Role & Branch Selector Bar */}
        <div className="grid grid-cols-1 gap-4 border-b border-blue-100/50 bg-blue-50/50 p-4 dark:border-blue-900/30 dark:bg-blue-950/20 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] font-bold text-gray-700 dark:text-slate-300">
              الدور الأساسي (Role):
            </label>
            <select
              value={selectedRole}
              onChange={e => {
                const newRole = e.target.value;
                setSelectedRole(newRole);
                const normalized = (newRole === 'owner' ? 'admin' : newRole) as Role;
                const defaultList = OFFLINE_ROLE_PERMISSIONS[normalized] || [];
                setGrantedPerms(new Set(defaultList));
              }}
              disabled={isOwner}
              className="w-full rounded-xl border border-gray-200 bg-white p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="admin">مسؤول نظام (Admin) - كامل الصلاحيات</option>
              <option value="manager">مدير فرع / مدير عام (Manager)</option>
              <option value="accountant">محاسب مالي (Accountant)</option>
              <option value="sales">مندوب / كاشير مبيعات (Sales)</option>
              <option value="viewer">مشاهد فقط (Viewer)</option>
              {isOwner && <option value="owner">مالك المنشأة (Owner)</option>}
            </select>
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1 text-[11px] font-bold text-gray-700 dark:text-slate-300">
              <GitBranch size={13} className="text-blue-500" />
              الفرع المخصص للعمل:
            </label>
            <select
              value={selectedBranchId}
              onChange={e => {
                setSelectedBranchId(e.target.value);
              }}
              className="w-full rounded-xl border border-gray-200 bg-white p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="">-- جميع الفروع (إدارة عامة) --</option>
              {branches
                ?.filter((b: any) => b.status === 'active')
                .map((branch: any) => (
                  <option key={branch.id} value={branch.id}>
                    📍 {branch.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Action quick buttons */}
        {!isOwner && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-gray-50 px-5 py-2.5 dark:border-slate-800 dark:bg-slate-950/30">
            <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400">
              تم تحديد ({grantedPerms.size}) صلاحية نشطة
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400"
              >
                <CheckCheck size={12} />
                تحديد الكل
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-600 transition-colors hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400"
              >
                <X size={12} />
                إلغاء الكل
              </button>
              <button
                type="button"
                onClick={handleResetToRoleDefaults}
                className="flex items-center gap-1 rounded-lg bg-gray-200/70 px-2.5 py-1 text-[10px] font-bold text-gray-700 transition-colors hover:bg-gray-300 dark:bg-slate-800 dark:text-slate-300"
              >
                <RotateCcw size={12} />
                استعادة الصلاحيات الافتراضية للدور
              </button>
            </div>
          </div>
        )}

        {/* Permissions Categories Grid */}
        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {isLoading ? (
            <div className="py-12 text-center text-xs font-bold text-gray-400">
              جاري تحميل بيانات الصلاحيات...
            </div>
          ) : isOwner ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-8 text-center dark:border-amber-800/40 dark:bg-amber-950/20">
              <Lock className="mx-auto mb-2 text-amber-500" size={32} />
              <h4 className="text-sm font-extrabold text-gray-800 dark:text-slate-100">
                حساب مالك المنشأة (Owner)
              </h4>
              <p className="mx-auto mt-1 max-w-md text-xs text-gray-500 dark:text-slate-400">
                يمتلك مالك المنشأة كافة الصلاحيات بشكل تلقائي ولا يمكن تقييد صلاحياته لضمان عدم قفل
                النظام.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {PERMISSION_CATEGORIES.map(cat => {
                const categoryActiveCount = cat.permissions.filter(p =>
                  grantedPerms.has(p.key)
                ).length;
                const isAllCategorySelected = categoryActiveCount === cat.permissions.length;

                return (
                  <div
                    key={cat.id}
                    className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-gray-50/40 p-4 dark:border-slate-800 dark:bg-slate-950/40"
                  >
                    <div>
                      <div className="mb-2.5 flex items-center justify-between border-b border-gray-200/60 pb-2.5 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-gray-900 dark:text-slate-100">
                            {cat.title}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setGrantedPerms(prev => {
                              const next = new Set(prev);
                              if (isAllCategorySelected) {
                                cat.permissions.forEach(p => next.delete(p.key));
                              } else {
                                cat.permissions.forEach(p => next.add(p.key));
                              }
                              return next;
                            });
                          }}
                          className="text-[10px] font-bold text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {isAllCategorySelected ? 'إلغاء القسم' : 'تحديد القسم'}
                        </button>
                      </div>

                      <div className="space-y-2">
                        {cat.permissions.map(perm => {
                          const isGranted = grantedPerms.has(perm.key);
                          return (
                            <label
                              key={perm.key}
                              className={cn(
                                'flex cursor-pointer select-none items-start gap-2.5 rounded-xl border p-2 text-right transition-all',
                                isGranted
                                  ? 'border-blue-200 bg-blue-50/70 dark:border-blue-800/50 dark:bg-blue-950/30'
                                  : 'border-gray-100 bg-[var(--app-surface)] opacity-70 hover:opacity-100 dark:border-slate-800/80'
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={isGranted}
                                onChange={() => {
                                  togglePermission(perm.key);
                                }}
                                className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span
                                    className={cn(
                                      'text-[11px] font-bold',
                                      isGranted
                                        ? 'text-blue-950 dark:text-blue-200'
                                        : 'text-gray-700 dark:text-slate-300'
                                    )}
                                  >
                                    {perm.label}
                                  </span>
                                  {perm.dangerous && (
                                    <span className="py-0.2 rounded bg-rose-100 px-1 text-[10px] font-bold text-rose-600 dark:bg-rose-900/30">
                                      حساس
                                    </span>
                                  )}
                                </div>
                                <span className="dir-ltr mt-0.5 block text-right font-mono text-[10px] text-gray-400 dark:text-slate-500">
                                  {perm.key}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t bg-gray-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
          <Button type="button" variant="ghost" onClick={onClose} className="text-xs font-bold">
            إلغاء
          </Button>

          <Button
            type="button"
            isLoading={isSaving}
            onClick={handleSave}
            className="rounded-xl px-6 text-xs font-bold shadow-lg shadow-blue-600/20"
            leftIcon={<Check size={16} />}
          >
            حفظ الصلاحيات المخصصة
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EmployeePermissionsModal;
