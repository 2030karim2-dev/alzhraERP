
import React from 'react';
import { cn } from '../../../../core/utils';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const ToggleSwitch: React.FC<Props> = ({ checked, onChange }) => {
  return (
    <div 
      onClick={() => onChange(!checked)}
      className={cn(
        "w-10 h-6 rounded-full transition-all cursor-pointer relative p-1",
        checked ? "bg-emerald-500" : "bg-gray-200 dark:bg-slate-700"
      )}
    >
      <div className={cn(
        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
        checked ? "right-5" : "right-1"
      )} />
    </div>
  );
}

export default ToggleSwitch;
