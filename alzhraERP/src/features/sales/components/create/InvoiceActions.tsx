import React from 'react';
import Button from '../../../../ui/base/Button';
import { Save, Printer, FileDown } from 'lucide-react';
import type { InvoiceStatus } from '../../types';

interface Props {
  onSave: (status: InvoiceStatus) => void;
  onPrint: () => void;
  isSaving: boolean;
}

const InvoiceActions: React.FC<Props> = ({ onSave, onPrint, isSaving }) => {
  return (
    <div className="flex w-full flex-wrap items-center justify-end gap-1.5 p-1.5 sm:w-auto sm:gap-2 sm:p-2">
      <Button
        onClick={() => {
          onSave('draft');
        }}
        isLoading={isSaving}
        variant="secondary"
        className="flex-1 rounded-xl text-xs sm:flex-none sm:text-sm"
        leftIcon={<FileDown size={14} />}
      >
        حفظ كمسودة
      </Button>

      <Button
        onClick={onPrint}
        variant="outline"
        className="flex-1 rounded-xl border-gray-200 text-xs text-gray-500 hover:text-indigo-600 sm:flex-none sm:text-sm"
        leftIcon={<Printer size={14} />}
      >
        طباعة
      </Button>

      <Button
        onClick={() => {
          onSave('posted');
        }}
        isLoading={isSaving}
        variant="primary"
        className="w-full rounded-xl text-xs sm:w-auto sm:min-w-[160px] sm:text-sm"
        leftIcon={<Save size={14} />}
      >
        حفظ وترحيل
      </Button>
    </div>
  );
};

export default InvoiceActions;
