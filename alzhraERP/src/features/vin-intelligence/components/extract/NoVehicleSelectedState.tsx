import React from 'react';
import { PackagePlus } from 'lucide-react';
import Button from '../../../../ui/base/Button';

interface NoVehicleSelectedStateProps {
  onNavigateToDecode?: (() => void) | undefined;
}

export const NoVehicleSelectedState: React.FC<NoVehicleSelectedStateProps> = React.memo(
  ({ onNavigateToDecode }) => (
    <div className="font-cairo rounded-2xl border border-slate-200 bg-white p-8 py-16 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
        <PackagePlus size={28} />
      </div>
      <h3 className="mb-2 text-base font-bold text-slate-800 dark:text-slate-100">
        لم يتم تحديد السيارة بعد
      </h3>
      <p className="mx-auto mb-6 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        يرجى فك رقم الشاصي (VIN) أو اختيار موديل ومواصفات السيارة في تبويب «فك الشاصي» لتتمكن من
        إضافة القطع وتسعيرها والتسمية التلقائية.
      </p>
      {onNavigateToDecode && (
        <Button
          size="md"
          onClick={onNavigateToDecode}
          className="rounded-xl bg-blue-600 font-bold text-white shadow-md shadow-blue-500/20"
        >
          الانتقال لفك الشاصي وتحديد السيارة
        </Button>
      )}
    </div>
  )
);

NoVehicleSelectedState.displayName = 'NoVehicleSelectedState';
