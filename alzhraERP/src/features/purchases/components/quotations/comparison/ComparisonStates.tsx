import React from 'react';
import { Loader2, Scale } from 'lucide-react';

/** حالة التحميل أثناء جلب عروض المقارنة. */
export const ComparisonLoadingState = (): React.ReactElement => (
  <div className="flex items-center justify-center py-16">
    <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
  </div>
);

/** حالة عدم وجود عروض قابلة للمقارنة. */
export const ComparisonEmptyState = (): React.ReactElement => (
  <div className="rounded-2xl border border-gray-100 bg-gray-50 py-12 text-center dark:border-slate-700 dark:bg-slate-800/50">
    <Scale size={40} className="mx-auto mb-3 text-gray-300 dark:text-slate-600" />
    <p className="font-medium text-gray-500 dark:text-gray-400">لا توجد عروض للمقارنة</p>
  </div>
);
