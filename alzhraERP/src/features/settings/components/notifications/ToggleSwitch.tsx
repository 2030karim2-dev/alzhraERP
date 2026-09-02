import React from 'react';
import { cn } from '../../../../core/utils';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const ToggleSwitch: React.FC<Props> = ({ checked, onChange }) => {
  return (
    <div
      onClick={() => {
        onChange(!checked);
      }}
      className={cn(
        'relative h-6 w-10 cursor-pointer rounded-full p-1 transition-all',
        checked ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-slate-700'
      )}
    >
      <div
        className={cn(
          'absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all',
          checked ? 'right-5' : 'right-1'
        )}
      />
    </div>
  );
};

export default ToggleSwitch;
