import React from 'react';
import { FileSpreadsheet, Download } from 'lucide-react';

interface Props {
  onDownload: () => void;
}

const ImportTemplateCard: React.FC<Props> = ({ onDownload }) => {
  return (
    <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/30 dark:bg-blue-900/10">
      <div className="flex items-center gap-3">
        <FileSpreadsheet className="text-blue-600" size={20} />
        <div>
          <h4 className="text-xs font-bold text-blue-800 dark:text-blue-300">نموذج الإدخال</h4>
          <p className="text-[10px] font-bold text-blue-600/70 dark:text-blue-400/60">
            قم بتحميل القالب لتعبئة بياناتك بشكل صحيح
          </p>
        </div>
      </div>
      <button
        onClick={onDownload}
        className="flex items-center gap-1 rounded-lg border border-blue-100 bg-white px-3 py-1.5 text-[10px] font-bold shadow-sm transition-colors hover:text-blue-600 dark:border-blue-900 dark:bg-slate-800"
      >
        <Download size={12} /> تحميل
      </button>
    </div>
  );
};

export default ImportTemplateCard;
