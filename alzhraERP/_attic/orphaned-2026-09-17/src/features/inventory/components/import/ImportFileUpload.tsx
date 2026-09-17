import React from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { cn } from '../../../../core/utils';

interface Props {
  file: File | null;
  onClick: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ImportFileUpload: React.FC<Props> = ({ file, onClick, inputRef, onFileChange }) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-all hover:bg-gray-50 dark:hover:bg-slate-800/50',
        file ? 'border-emerald-400 bg-emerald-50/30' : 'border-gray-200 dark:border-slate-700'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={onFileChange}
      />
      {file ? (
        <div className="animate-in zoom-in text-center">
          <FileSpreadsheet size={48} className="mx-auto mb-2 text-emerald-500" />
          <p className="text-sm font-bold text-gray-800 dark:text-slate-200">{file.name}</p>
          <p className="text-[10px] font-bold text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
        </div>
      ) : (
        <div className="text-center text-gray-400">
          <Upload size={32} className="mx-auto mb-3 opacity-50" />
          <p className="text-xs font-bold">اضغط لاختيار ملف Excel</p>
          <p className="mt-1 text-[10px]">يدعم الامتدادات .xlsx, .csv</p>
        </div>
      )}
    </div>
  );
};

export default ImportFileUpload;
