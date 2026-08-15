import React from 'react';
import type { CommissionPeriodState } from '../types';
import { CommissionPeriodControls } from './CommissionPeriodControls';
import { CommissionPeriodList } from './CommissionPeriodList';
import { useCommissionPeriodsController } from './useCommissionPeriodsController';

const states: CommissionPeriodState[] = ['open', 'calculating', 'calculated', 'under_review', 'approved', 'locked', 'paid'];
const labels = new Map<CommissionPeriodState, string>([
  ['open', 'مفتوحة'],
  ['calculating', 'جارٍ الحساب'],
  ['calculated', 'تم الحساب'],
  ['under_review', 'قيد المراجعة'],
  ['approved', 'معتمدة'],
  ['locked', 'مقفلة'],
  ['paid', 'مدفوعة'],
]);

export default function CommissionPeriodsPage(): React.JSX.Element {
  const controller = useCommissionPeriodsController();
  if (controller.companyId === undefined || controller.companyId.length === 0) {
    return <div dir="rtl" className="p-6 text-[var(--app-text-secondary)]">لا يمكن تحميل الفترات قبل تحديد الشركة.</div>;
  }
  return (
    <div dir="rtl" className="min-h-full space-y-6 bg-[var(--app-bg)] p-4 sm:p-6">
      <header>
        <p className="text-sm text-[var(--app-text-secondary)]">الحوافز / دورة الحياة</p>
        <h1 className="mt-1 text-2xl font-bold text-[var(--app-text)]">إدارة فترات العمولات</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--app-text-secondary)]">كل انتقال يمر عبر PostgreSQL state-machine وRLS. لا يمكن للواجهة تجاوز حماية الفترة التجريبية.</p>
      </header>
      {controller.selected !== undefined ? (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <CommissionPeriodList periods={controller.periods} selectedPeriodId={controller.selected.id} onSelect={controller.setSelectedId} labels={labels} />
          <CommissionPeriodControls
            selected={controller.selected}
            state={controller.selected.state}
            target={controller.target}
            labels={labels}
            states={states}
            isProtectedTest={controller.isProtectedTest}
            isTerminal={controller.target === undefined}
            isCalculating={controller.isCalculating}
            isTransitioning={controller.isTransitioning}
            hasError={controller.hasError}
            onCalculate={controller.calculate}
            onTransition={controller.transition}
          />
        </section>
      ) : (
        <CommissionPeriodList periods={controller.periods} onSelect={controller.setSelectedId} labels={labels} />
      )}
    </div>
  );
}
