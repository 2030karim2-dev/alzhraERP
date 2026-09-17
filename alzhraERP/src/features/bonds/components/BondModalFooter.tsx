import React from 'react';
import { Keyboard, Save } from 'lucide-react';
import type { BondType } from '../types';
import Button from '../../../ui/base/Button';

interface BondModalFooterProps {
  type: BondType;
  loading: boolean;
  onCancel: () => void;
  onSave: React.MouseEventHandler<HTMLButtonElement>;
}

export function BondModalFooter({ type, loading, onCancel, onSave }: BondModalFooterProps) {
  return (
    <div className="flex w-full items-center justify-between gap-3 p-1">
      <div className="hidden items-center gap-3 text-xs text-slate-400 lg:flex">
        <span className="flex items-center gap-1 font-mono">
          <Keyboard size={14} />
          <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Ctrl + Enter
          </kbd>{' '}
          للحفظ السريع
        </span>
        <span className="flex items-center gap-1 font-mono">
          <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Esc
          </kbd>{' '}
          للإلغاء
        </span>
      </div>

      <div className="flex w-full items-center gap-3 lg:w-auto">
        <Button
          onClick={onCancel}
          variant="outline"
          className="flex-1 px-6 py-3 text-xs font-bold uppercase transition-all hover:bg-gray-100 dark:hover:bg-slate-800 lg:flex-none"
        >
          إلغاء
        </Button>
        <Button
          onClick={onSave}
          isLoading={loading}
          disabled={loading}
          variant={type === 'receipt' ? 'success' : type === 'transfer' ? 'primary' : 'danger'}
          className="flex-2 px-8 py-3 text-xs font-bold uppercase shadow-xl shadow-blue-500/10 lg:flex-none"
          leftIcon={<Save size={18} className="transition-transform group-hover:scale-110" />}
        >
          اعتماد السند وحفظه
        </Button>
      </div>
    </div>
  );
}
