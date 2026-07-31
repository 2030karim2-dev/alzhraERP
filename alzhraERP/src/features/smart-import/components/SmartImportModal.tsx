
import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Loader2, Download, Save, X, Sparkles, CheckCircle } from 'lucide-react';
import Modal from '../../../ui/base/Modal';
import Button from '../../../ui/base/Button';
import { documentAiService } from '../../ai/documentService';
import ExcelTable from '../../../ui/common/ExcelTable';
import { useFeedbackStore } from '../../feedback/store';
import { cn } from '../../../core/utils';
import * as _XLSX from 'xlsx-js-style';
const XLSX = _XLSX as any;

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (items: any[]) => void;
    mode: 'invoice' | 'inventory';
}

const SmartImportModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, mode }) => {
    const { showToast } = useFeedbackStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [step, setStep] = useState<'upload' | 'review'>('upload');
    const [isProcessing, setIsProcessing] = useState(false);
    const [extractedItems, setExtractedItems] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_filePreview, setFilePreview] = useState<string | null>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Preview setup
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => setFilePreview(e.target?.result as string);
            reader.readAsDataURL(file);
        } else {
            setFilePreview(null);
        }

        setIsProcessing(true);
        try {
            const result = await documentAiService.parseDocument(file, mode);
            const items = result.items;

            if (!items || items.length === 0) {
                throw new Error("لم يتم العثور على جداول بيانات واضحة في الملف");
            }
            setExtractedItems(items);
            setStep('review');
            showToast(`تم استخراج ${items.length} صنف بنجاح`, 'success');
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUpdateCell = (rowIndex: number, key: string, value: any) => {
        const updated = [...extractedItems];
        updated[rowIndex] = { ...updated[rowIndex], [key]: value };
        setExtractedItems(updated);
    };

    const handleRemoveRow = (row: any) => {
        const index = extractedItems.indexOf(row);
        if (index > -1) {
            setExtractedItems(prev => prev.filter((_, i) => i !== index));
        }
    };

    const downloadTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([
            { "اسم المنتج": "فحمات فرامل", "رقم الصنف": "BP-001", "الشركة": "Toyota", "سعر البيع": 150, "التكلفة": 100, "الكمية": 50 }
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "Inventory_Template.xlsx");
    };

    const columns = mode === 'invoice' ? [
        { header: 'اسم الصنف', accessor: (row: any) => row.name, isEditable: true, accessorKey: 'name' },
        { header: 'الكمية', accessor: (row: any) => row.quantity, isEditable: true, accessorKey: 'quantity', width: 'w-20' },
        { header: 'السعر', accessor: (row: any) => row.unitPrice, isEditable: true, accessorKey: 'unitPrice', width: 'w-24' },
        { header: 'SKU', accessor: (row: any) => row.sku || '---', isEditable: true, accessorKey: 'sku', width: 'w-24' },
        {
            header: 'حذف',
            accessor: (_: any) => <X size={14} />,
            width: 'w-10',
            className: 'text-center text-rose-500 cursor-pointer hover:bg-rose-50'
        }
    ] : [
        // Inventory Columns
        { header: 'اسم الصنف', accessor: (row: any) => row.name, isEditable: true, accessorKey: 'name' },
        { header: 'الكمية', accessor: (row: any) => row.stock_quantity, isEditable: true, accessorKey: 'stock_quantity', width: 'w-24' },
        { header: 'التكلفة', accessor: (row: any) => row.cost_price, isEditable: true, accessorKey: 'cost_price', width: 'w-24' },
        { header: 'الباركود/SKU', accessor: (row: any) => row.sku || '---', isEditable: true, accessorKey: 'sku', width: 'w-32' },
        {
            header: 'حذف',
            accessor: (_: any) => <X size={14} />,
            width: 'w-10',
            className: 'text-center text-rose-500 cursor-pointer hover:bg-rose-50'
        }
    ];

    const resetModal = () => {
        setStep('upload');
        setExtractedItems([]);
        setFilePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClose = () => {
        resetModal();
        onClose();
    };

    const triggerFileInput = () => !isProcessing && fileInputRef.current?.click();

    const footer = (
        <div className="flex w-full gap-2 pt-2 border-t dark:border-slate-800">
            <Button variant="outline" onClick={handleClose} className="flex-1">إلغاء</Button>
            {step === 'review' && (
                <Button
                    onClick={() => { onConfirm(extractedItems); handleClose(); }}
                    className="flex-[2]"
                    leftIcon={<Save size={16} />}
                >
                    اعتماد البيانات ({extractedItems.length})
                </Button>
            )}
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            icon={Sparkles}
            title="الاستيراد الذكي (AI Import)"
            description="استخراج البيانات من الفواتير الورقية أو ملفات Excel/PDF"
            footer={footer}
        >
            <div className="min-h-[400px] flex flex-col">
                {step === 'upload' ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">

                        {/* Template Download Section if Inventory Mode */}
                        {mode === 'inventory' && (
                            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 flex justify-between items-center w-full mb-4">
                                <div className="flex items-center gap-3">
                                    <FileSpreadsheet className="text-blue-600" size={20} />
                                    <div>
                                        <h4 className="text-xs font-bold text-blue-800 dark:text-blue-300">نموذج الإدخال</h4>
                                        <p className="text-[9px] font-bold text-blue-600/70 dark:text-blue-400/60">قم بتحميل القالب لتعبئة بياناتك بشكل صحيح</p>
                                    </div>
                                </div>
                                <button onClick={downloadTemplate} className="flex items-center gap-1 text-[9px] font-bold bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg shadow-sm border border-blue-100 dark:border-blue-900 hover:text-blue-600 transition-colors">
                                    <Download size={12} /> تحميل
                                </button>
                            </div>
                        )}

                        <div
                            onClick={triggerFileInput}
                            className={cn(
                                "w-full h-64 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center cursor-pointer transition-all gap-4 group",
                                isProcessing ? "border-blue-500 bg-blue-50/50 cursor-wait" : "border-gray-200 dark:border-slate-700 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-slate-800/50"
                            )}
                        >
                            {isProcessing ? (
                                <>
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20"></div>
                                        <Loader2 size={48} className="text-blue-600 animate-spin relative z-10" />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="font-bold text-gray-800 dark:text-slate-200">جاري تحليل الملف...</h3>
                                        <p className="text-[10px] text-gray-400 font-bold">يقوم الذكاء الاصطناعي بقراءة البيانات وهيكلتها</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="w-20 h-20 bg-blue-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/10">
                                        <Upload size={32} />
                                    </div>
                                    <div className="text-center space-y-1">
                                        <h3 className="font-bold text-lg text-gray-700 dark:text-slate-200">اضغط لرفع الملف</h3>
                                        <p className="text-[10px] font-bold text-gray-400">يدعم الصور (PNG, JPG) و PDF و Excel</p>
                                    </div>
                                </>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,.pdf,.xlsx,.xls,.csv"
                                className="hidden"
                                onChange={handleFileSelect}
                                disabled={isProcessing}
                            />
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex gap-3 items-start w-full">
                            <Sparkles className="text-amber-500 shrink-0 mt-0.5" size={18} />
                            <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400 leading-relaxed">
                                النظام يستخدم نموذج Gemini 2.5 Flash للتعرف الذكي على الحقول حتى لو اختلفت المسميات (مثلاً: "العدد" سيفهم أنها "الكمية").
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col h-full gap-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                                <CheckCircle className="text-emerald-500" size={16} />
                                البيانات المستخرجة
                            </h3>
                            <button onClick={resetModal} className="text-[10px] font-bold text-blue-600 hover:underline">
                                إعادة الرفع
                            </button>
                        </div>

                        <div className="flex-1 border-2 border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                            <ExcelTable
                                columns={columns}
                                data={extractedItems}
                                onCellUpdate={(rowIndex, key, val) => handleUpdateCell(rowIndex, key as string, val)}
                                onRowClick={handleRemoveRow}
                                title={`تم استخراج ${extractedItems.length} سجل`}
                            />
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default SmartImportModal;
