import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useCommissionConfigurationData } from './useCommissionConfigurationData';
import { PlanDetails, PlanForm, PlanList } from './CommissionConfigurationComponents';

export default function CommissionConfigurationPage(): React.JSX.Element {
  const props = useCommissionConfigurationData();
  if (props.companyId === undefined || props.companyId.length === 0) return <div dir="rtl" className="p-6 text-[var(--app-text-secondary)]">لا يمكن إدارة الخطط قبل تحديد الشركة.</div>;
  if (!props.canManage) return <div dir="rtl" className="m-6 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-800"><ShieldAlert size={20} /> ليست لديك صلاحية إدارة خطط العمولات.</div>;
  return <div dir="rtl" className="min-h-full space-y-6 bg-[var(--app-bg)] p-4 sm:p-6"><header><p className="text-sm text-[var(--app-text-secondary)]">الإدارة المالية / الإعدادات</p><h1 className="mt-1 text-2xl font-bold text-[var(--app-text)]">خطط وقواعد العمولات</h1><p className="mt-2 text-sm text-[var(--app-text-secondary)]">تُطبّق الصلاحيات خادميًا، وتبقى أي خطة مرتبطة بسجل التدقيق وقواعد الشركة.</p></header><section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]"><PlanForm {...props} /><PlanList {...props} /></section><PlanDetails {...props} /></div>;
}
