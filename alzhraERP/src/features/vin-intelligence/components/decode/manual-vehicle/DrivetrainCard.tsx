import React from 'react';
import { Sliders } from 'lucide-react';
import { SpecCard, OptionToggle } from './cards';
import type { ManualVehicleFieldsProps } from './types';

const TRANSMISSION_ACTIVE =
  'border border-slate-200/60 bg-white text-indigo-600 shadow-xs dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-300';
const DRIVE_ACTIVE =
  'border border-slate-200/60 bg-white text-blue-600 shadow-xs dark:border-slate-700 dark:bg-slate-800 dark:text-blue-300';

interface ToggleFieldProps {
  label: string;
  options: Array<{ value: string; text: string }>;
  activeValue: string;
  onSelect: (value: string) => void;
  activeClassName: string;
}

function ToggleField({
  label,
  options,
  activeValue,
  onSelect,
  activeClassName,
}: ToggleFieldProps): React.ReactElement {
  return (
    <div>
      <span className="mb-0.5 block text-[10px] font-bold text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <div className="grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-750 dark:bg-slate-950">
        <OptionToggle
          options={options}
          activeValue={activeValue}
          onSelect={onSelect}
          activeClassName={activeClassName}
        />
      </div>
    </div>
  );
}

export function DrivetrainCard({
  draft,
  onChange,
}: ManualVehicleFieldsProps<'transmission' | 'drive'>): React.ReactElement {
  return (
    <SpecCard
      icon={<Sliders size={13} className="text-indigo-500 dark:text-indigo-400" />}
      title="الجير ونظام الدفع"
      headerLayout="inline"
    >
      <div className="space-y-1.5">
        <ToggleField
          label="ناقل الحركة"
          options={[
            { value: 'تماتيك', text: 'تماتيك (Auto)' },
            { value: 'عادي', text: 'عادي (Manual)' },
          ]}
          activeValue={draft.transmission}
          onSelect={value => {
            onChange({ transmission: value });
          }}
          activeClassName={TRANSMISSION_ACTIVE}
        />

        <ToggleField
          label="نظام الدفع"
          options={[
            { value: 'سنجل', text: 'سنجل (2WD)' },
            { value: 'دبل', text: 'دبل (4x4)' },
          ]}
          activeValue={draft.drive}
          onSelect={value => {
            onChange({ drive: value });
          }}
          activeClassName={DRIVE_ACTIVE}
        />
      </div>
    </SpecCard>
  );
}
