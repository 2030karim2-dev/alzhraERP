
import React from 'react';
import Button from '../../../../ui/base/Button';
import { Save, Printer, FileDown } from 'lucide-react';
import { InvoiceStatus } from '../../types';

interface Props {
  onSave: (status: InvoiceStatus) => void;
  onPrint: () => void;
  isSaving: boolean;
}

const InvoiceActions: React.FC<Props> = ({ onSave, onPrint, isSaving }) => {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 p-2">
        <Button 
            onClick={() => onSave('draft')}
            isLoading={isSaving} 
            variant="secondary" 
            className="rounded-xl"
            leftIcon={<FileDown size={14}/>}
        >
            حفظ كمسودة
        </Button>
        
        <Button 
            onClick={onPrint} 
            variant="outline" 
            className="border-gray-200 text-gray-500 hover:text-indigo-600 rounded-xl"
            leftIcon={<Printer size={14}/>}
        >
            طباعة
        </Button>

        <Button 
            onClick={() => onSave('posted')} 
            isLoading={isSaving} 
            variant="primary"
            className="min-w-[160px] rounded-xl"
            leftIcon={<Save size={14} />}
        >
            حفظ وترحيل
        </Button>
    </div>
  );
};

export default InvoiceActions;
