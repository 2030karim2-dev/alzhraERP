import React, { useState } from 'react';
import { ShieldCheck, Check, X, Sparkles } from 'lucide-react';
import { cn } from '../../../../core/utils';
import { useI18nStore } from '@/lib/i18nStore';
import { PERMISSION_CATEGORIES } from '../../../../core/permissions/permissionTaxonomy';
import { OFFLINE_ROLE_PERMISSIONS } from '../../../../core/permissions/offlineRolePermissions';
import type { Role } from '../../../../core/types/common';

const ROLES: Array<{ key: Role | 'owner'; label: string; color: string }> = [
  { key: 'owner', label: 'المالك', color: 'text-amber-600 dark:text-amber-400' },
  { key: 'admin', label: 'مسؤول نظام', color: 'text-rose-600 dark:text-rose-400' },
  { key: 'manager', label: 'مدير', color: 'text-blue-600 dark:text-blue-400' },
  { key: 'accountant', label: 'محاسب', color: 'text-emerald-600 dark:text-emerald-400' },
  { key: 'sales', label: 'مبيعات', color: 'text-purple-600 dark:text-purple-400' },
  { key: 'viewer', label: 'مشاهد', color: 'text-slate-600 dark:text-slate-400' },
];

const PermissionsManager: React.FC = () => {
  const { dictionary: t } = useI18nStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredCategories =
    selectedCategory === 'all'
      ? PERMISSION_CATEGORIES
      : PERMISSION_CATEGORIES.filter(c => c.id === selectedCategory);

  const hasRolePermission = (role: Role | 'owner', permKey: string): boolean => {
    if (role === 'owner') return true; // Owner has all permissions
    const list = OFFLINE_ROLE_PERMISSIONS[role] || [];
    return list.includes(permKey as any);
  };

  return (
    <div className="animate-in fade-in overflow-hidden rounded-3xl border border-gray-100 bg-[var(--app-surface)] shadow-sm duration-500 dark:border-slate-800">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b bg-gray-50/50 p-5 dark:border-slate-800 dark:bg-slate-950/50">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-blue-600 p-2.5 text-white shadow-lg shadow-blue-500/20">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-gray-900 dark:text-slate-100">
              {t.permissions_matrix || 'مصفوفة الصلاحيات القياسية للأدوار'}
            </h3>
            <p className="text-[10px] font-bold text-gray-400">
              استعراض الصلاحيات الافتراضية لكل دور وظيفي في المنظومة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-600 dark:border-blue-800/40 dark:bg-blue-950/40 dark:text-blue-400">
            <Sparkles size={12} />
            يمكن تخصيص صلاحيات إضافية لكل موظف من تبويب "فريق العمل"
          </span>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2 border-b border-gray-100 bg-gray-50/30 p-4 dark:border-slate-800/80 dark:bg-slate-950/20">
        <button
          type="button"
          onClick={() => {
            setSelectedCategory('all');
          }}
          className={cn(
            'rounded-xl px-3 py-1 text-[11px] font-bold transition-all',
            selectedCategory === 'all'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
          )}
        >
          كافة الأقسام
        </button>
        {PERMISSION_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => {
              setSelectedCategory(cat.id);
            }}
            className={cn(
              'rounded-xl px-3 py-1 text-[11px] font-bold transition-all',
              selectedCategory === cat.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
            )}
          >
            {cat.title}
          </button>
        ))}
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="border-b bg-gray-100/70 text-[10px] font-extrabold uppercase text-gray-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
              <th className="w-1/3 p-3.5">صلاحية الإجراء والنظام</th>
              {ROLES.map(r => (
                <th key={r.key} className={cn('p-3.5 text-center', r.color)}>
                  {r.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {filteredCategories.map(cat => (
              <React.Fragment key={cat.id}>
                <tr className="border-y border-blue-100/60 bg-blue-50/40 dark:border-blue-900/30 dark:bg-blue-950/20">
                  <td
                    colSpan={ROLES.length + 1}
                    className="p-2.5 px-4 text-[11px] font-extrabold text-blue-900 dark:text-blue-300"
                  >
                    📂 {cat.title}
                  </td>
                </tr>
                {cat.permissions.map(perm => (
                  <tr
                    key={perm.key}
                    className="transition-colors hover:bg-gray-50/50 dark:hover:bg-slate-800/30"
                  >
                    <td className="p-3.5 font-bold text-gray-800 dark:text-slate-200">
                      <div>{perm.label}</div>
                      <div className="dir-ltr mt-0.5 text-right font-mono text-[10px] text-gray-400 dark:text-slate-500">
                        {perm.key}
                      </div>
                    </td>
                    {ROLES.map(r => {
                      const granted = hasRolePermission(r.key, perm.key);
                      return (
                        <td key={r.key} className="p-3.5 text-center">
                          <div
                            className={cn(
                              'mx-auto flex h-6 w-6 items-center justify-center rounded-full transition-all',
                              granted
                                ? 'border border-emerald-200 bg-emerald-100 text-emerald-600 dark:border-emerald-800/40 dark:bg-emerald-950/50 dark:text-emerald-400'
                                : 'bg-gray-100/70 text-gray-300 dark:bg-slate-800 dark:text-slate-600'
                            )}
                          >
                            {granted ? <Check size={13} strokeWidth={3} /> : <X size={12} />}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PermissionsManager;
