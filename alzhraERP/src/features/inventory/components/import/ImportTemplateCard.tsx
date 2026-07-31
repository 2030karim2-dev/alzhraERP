import React from 'react';
import { FileSpreadsheet, Download } from 'lucide-react';

interface Props {
    onDownload: () => void;
}

const ImportTemplateCard: React.FC<Props> = ({ onDownload }) => {
    return (
        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <FileSpreadsheet className="text-blue-600" size={20} />
                <div>
                    <h4 className="text-xs font-bold text-blue-800 dark:text-blue-300">نموذج الإدخال</h4>
                    <p className="text-[9px] font-bold text-blue-600/70 dark:text-blue-400/60">قم بتحميل القالب لتعبئة بياناتك بشكل صحيح</p>
                </div>
            </div>
            <button 
                onClick={onDownload} 
                className="flex items-center gap-1 text-[9px] font-bold bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg shadow-sm border border-blue-100 dark:border-blue-900 hover:text-blue-600 transition-colors"
            >
                <Download size={12} /> تحميل
            </button>
        </div>
    );
};

export default ImportTemplateCard;
