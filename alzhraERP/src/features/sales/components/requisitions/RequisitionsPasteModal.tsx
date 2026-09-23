/* eslint-disable max-lines-per-function */
import React, { useState } from 'react';
import { Clipboard, Check, X } from 'lucide-react';
import { useRequisitionsStore } from '../../store/requisitionsStore';

interface RequisitionsPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RequisitionsPasteModal: React.FC<RequisitionsPasteModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [pasteContent, setPasteContent] = useState('');
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const { importFromText } = useRequisitionsStore();

  if (!isOpen) return null;

  const handleImport = (): void => {
    const count = importFromText(pasteContent);
    setImportedCount(count);
    if (count > 0) {
      setTimeout(() => {
        setImportedCount(null);
        setPasteContent('');
        onClose();
      }, 700);
    }
  };

  return (
    <div className="backdrop-blur-xs fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div
        className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        dir="rtl"
      >
        <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Clipboard size={18} className="text-blue-600" />
            <h3 className="text-sm font-bold">لصق سريع من ملف إكسل</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={16} />
          </button>
        </div>

        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          انسخ الخلايا من جدول إكسل (اسم القطعة، رقم القطعة، الشركة، الكمية، ملاحظات) والصقها هنا
          مباشرة:
        </p>

        <textarea
          rows={6}
          value={pasteContent}
          onChange={e => {
            setPasteContent(e.target.value);
          }}
          placeholder={`مثال:\nفحمات سيراميك\t04465-33470\tتويوتا\t4\tأصلية ياباني\nشمعات إشعال\tSK20HR11\tدنسو\t8\tمطلوب كرتون`}
          className="w-full rounded-lg border border-slate-300 p-2.5 font-mono text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          dir="ltr"
        />

        {importedCount !== null && (
          <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-emerald-600">
            <Check size={14} />
            <span>تم استيراد {importedCount} صنف بنجاح!</span>
          </div>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!pasteContent.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
          >
            <Clipboard size={14} />
            <span>استيراد إلى الجدول</span>
          </button>
        </div>
      </div>
    </div>
  );
};
