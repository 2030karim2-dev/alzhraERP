
import React from 'react';
import { ShieldCheck, Check, X, Info } from 'lucide-react';
import { cn } from '../../../../core/utils';
import { useI18nStore } from '@/lib/i18nStore';
import { useFeedbackStore } from '../../../feedback/store';

interface PermissionRow {
  action: string;
  label: string;
  owner: boolean;
  manager: boolean;
  accountant: boolean;
  sales: boolean;
}

const permissionsData: PermissionRow[] = [
  { action: 'create_product', label: 'إضافة منتجات جديدة', owner: true, manager: true, accountant: false, sales: true },
  { action: 'delete_product', label: 'حذف منتجات', owner: true, manager: true, accountant: false, sales: false },
  { action: 'view_financials', label: 'الاطلاع على التقارير المالية', owner: true, manager: true, accountant: true, sales: false },
  { action: 'post_journal', label: 'ترحيل قيود يومية', owner: true, manager: true, accountant: true, sales: false },
  { action: 'create_purchase', label: 'إصدار فواتير شراء', owner: true, manager: true, accountant: false, sales: false },
  { action: 'close_fiscal_year', label: 'إغلاق السنة المالية', owner: true, manager: false, accountant: false, sales: false },
  { action: 'manage_users', label: 'إدارة المستخدمين', owner: true, manager: false, accountant: false, sales: false },
];

const PermissionsManager: React.FC = () => {
  const { dictionary: t } = useI18nStore();
  const { showToast } = useFeedbackStore();

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in duration-500">
      <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-950/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h3 className="text-[11px] font-bold text-gray-800 dark:text-slate-100 uppercase tracking-tight">
              {t.permissions_matrix || 'مصفوفة الصلاحيات'}
            </h3>
            <p className="text-[9px] font-bold text-gray-400">
              {t.central_team_control || 'تحكم مركزي في أدوار الفريق'}
            </p>
          </div>
        </div>
        <button
          onClick={() => showToast(t.contact_support_to_edit || 'تواصل مع الدعم الفني', 'info')}
          className="bg-amber-50 dark:bg-amber-900/10 px-3 py-1.5 rounded-lg border border-amber-100 dark:border-amber-800/30 flex items-center gap-2"
        >
          <Info size={14} className="text-amber-500" />
          <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400">
            {t.contact_support_to_edit || 'تواصل مع الدعم'}
          </span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead>
            <tr className="bg-gray-100 dark:bg-slate-800 text-[9px] font-bold text-gray-500 uppercase tracking-widest border-b dark:border-slate-700">
              <th className="p-3 w-1/3">صلاحية الإجراء</th>
              <th className="p-3 text-center text-rose-600">المالك</th>
              <th className="p-3 text-center text-blue-600">المدير</th>
              <th className="p-3 text-center text-emerald-600">محاسب</th>
              <th className="p-3 text-center text-gray-500">مبيعات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
            {permissionsData.map((perm, idx) => (
              <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/20 transition-colors">
                <td className="p-4 font-bold text-gray-700 dark:text-slate-300">{perm.label}</td>
                {['owner', 'manager', 'accountant', 'sales'].map((role) => (
                  <td key={role} className="p-4 text-center">
                    <div className={cn(
                      "mx-auto w-6 h-6 rounded-full flex items-center justify-center",
                      perm[role as keyof PermissionRow]
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
                        : "bg-gray-100 dark:bg-slate-800 text-gray-300 dark:text-slate-600"
                    )}>
                      {perm[role as keyof PermissionRow] ? <Check size={12} strokeWidth={4} /> : <X size={12} />}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PermissionsManager;
