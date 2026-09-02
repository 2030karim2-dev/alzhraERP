import React from 'react';
import { Sparkles, ClipboardPaste } from 'lucide-react';
import Button from '../../../../ui/base/Button';
import { useFeedbackStore } from '../../../feedback/store';

export interface BulkPartsPasteDropzoneProps {
  isOpen: boolean;
  onToggle: () => void;
  rawText: string;
  onTextChange: (text: string) => void;
  onApply: () => void;
}

export const BulkPartsPasteDropzone: React.FC<BulkPartsPasteDropzoneProps> = ({
  isOpen,
  onToggle,
  rawText,
  onTextChange,
  onApply,
}) => {
  const { showToast } = useFeedbackStore();

  const handlePasteClipboard = async (): Promise<void> => {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip) onTextChange(clip);
    } catch {
      showToast('يرجى السماح بالوصول للحافظة أو اللصق اليدوي (Ctrl+V)', 'info');
    }
  };

  return (
    <div className="space-y-2.5 rounded-2xl border border-blue-200/80 bg-blue-50/40 p-3.5 shadow-sm dark:border-blue-900/50 dark:bg-blue-950/20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <Sparkles size={13} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              الإدخال واللصق الذكي للقطع (Smart Bulk Parts Parser)
            </span>
            <span className="mr-2 text-[10px] font-medium text-slate-500 dark:text-slate-400">
              الصق أرقام وأسماء القطع وسيتم استخلاصها وتسميتها تلقائياً بمواصفات المركبة
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="text-xs font-bold text-blue-700 hover:text-blue-800 hover:underline dark:text-blue-300 dark:hover:text-blue-200"
        >
          {isOpen ? 'إخفاء مربع اللصق ▲' : 'إظهار مربع اللصق السريع ▼'}
        </button>
      </div>

      {isOpen && (
        <div className="space-y-2 border-t border-blue-200/60 pt-2 dark:border-blue-900/40">
          <textarea
            rows={4}
            value={rawText}
            onChange={e => onTextChange(e.target.value)}
            placeholder={`الصق قائمة القطع هنا بأي شكل، مثلاً:\nباكن راس\n11115-37051\nكرسي مكينه يمين\n12305-37021\nأو:\nباكن غطاء 11213-37021`}
            className="w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            dir="auto"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => void handlePasteClipboard()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <ClipboardPaste size={14} /> لصق من الحافظة 📋
            </button>

            <div className="flex items-center gap-2">
              {rawText.length > 0 && (
                <button
                  type="button"
                  onClick={() => onTextChange('')}
                  className="px-2 py-1 text-xs text-slate-400 hover:text-rose-500"
                >
                  مسح
                </button>
              )}
              <Button
                size="sm"
                variant="primary"
                onClick={onApply}
                disabled={!rawText.trim()}
                className="rounded-xl bg-blue-600 font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700"
              >
                <Sparkles size={14} className="ml-1" />
                استخراج وتوليد أسماء المنتجات الذكية ⚡
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
