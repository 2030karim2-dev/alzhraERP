
import React from 'react';
import { Upload, AlertCircle } from 'lucide-react';
import Modal from '../../../ui/base/Modal';
import Button from '../../../ui/base/Button';
import { useExcelImport } from '../hooks/useExcelImport';
import ImportTemplateCard from './import/ImportTemplateCard';
import ImportFileUpload from './import/ImportFileUpload';
import ImportDataPreview from './import/ImportDataPreview';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const ImportProductsModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const {
        file,
        status,
        errorMsg,
        preview,
        fileInputRef,
        handleFileChange,
        handleImport,
        downloadTemplate
    } = useExcelImport();

    const footer = (
        <>
            {status === 'success' ? (
                <Button onClick={onClose} className="w-full bg-emerald-600 hover:bg-emerald-700">إغلاق</Button>
            ) : (
                <div className="flex w-full gap-2">
                    <Button variant="outline" onClick={onClose} className="flex-1">إلغاء</Button>
                    <Button
                        onClick={handleImport}
                        isLoading={status === 'uploading'}
                        disabled={!file}
                        className="flex-[2]"
                    >
                        بدء الاستيراد
                    </Button>
                </div>
            )}
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            icon={Upload}
            title="استيراد الأصناف (Excel)"
            description="إضافة كميات كبيرة من المنتجات دفعة واحدة"
            footer={footer}
        >
            <div className="space-y-6">
                <ImportTemplateCard onDownload={downloadTemplate} />

                <ImportFileUpload 
                    file={file}
                    onClick={() => fileInputRef.current?.click()}
                    inputRef={fileInputRef}
                    onFileChange={handleFileChange}
                />

                <ImportDataPreview preview={preview} />

                {/* Status Messages */}
                {status === 'success' && (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-3 text-emerald-700 dark:text-emerald-400 animate-in fade-in">
                        <CheckCircleCircle size={24} />
                        <div>
                            <h4 className="font-bold text-xs">تم الاستيراد بنجاح!</h4>
                            <p className="text-[9px] font-bold opacity-80">تمت إضافة المنتجات إلى قاعدة البيانات.</p>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-100 dark:border-rose-100 dark:bg-rose-900/20 rounded-xl border border-rose-100 dark:border-rose-900/30 flex items-center gap-3 text-rose-700 dark:text-rose-400 animate-in shake">
                        <AlertCircle size={24} />
                        <div>
                            <h4 className="font-bold text-xs">فشل الاستيراد</h4>
                            <p className="text-[9px] font-bold opacity-80">{errorMsg}</p>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

// Internal icon component
const CheckCircleCircle = ({ size, className }: { size: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
);

export default ImportProductsModal;
