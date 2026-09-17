import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  Download,
  Save,
  X,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import Modal from '../../../ui/base/Modal';
import Button from '../../../ui/base/Button';
import { documentAiService } from '../../ai/documentService';
import ExcelTable from '../../../ui/common/ExcelTable';
import { useFeedbackStore } from '../../feedback/store';
import { cn } from '../../../core/utils';

// 🔒 Lazy-load the heavy xlsx library only when actually needed.
interface XlsxLike {
  utils: {
    json_to_sheet(data: unknown[]): unknown;
    book_new(): unknown;
    book_append_sheet(workbook: unknown, worksheet: unknown, name?: string): void;
  };
  writeFile(workbook: unknown, filename: string): void;
}

let xlsxPromise: Promise<XlsxLike> | null = null;
const loadXLSX = (): Promise<XlsxLike> => {
  xlsxPromise ??= import('xlsx-js-style').then(m => (m.default ?? m) as XlsxLike);
  return xlsxPromise;
};

interface ImportItem {
  name?: string;
  quantity?: number | string;
  unitPrice?: number | string;
  sku?: string;
  stock_quantity?: number | string;
  cost_price?: number | string;
  [key: string]: unknown;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (items: ImportItem[]) => void;
  mode: 'invoice' | 'inventory';
}

const SmartImportModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, mode }) => {
  const { showToast } = useFeedbackStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ImportItem[]>([]);

  const [_filePreview, setFilePreview] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview setup
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => {
        setFilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }

    setIsProcessing(true);
    try {
      const result = await documentAiService.parseDocument(file, mode);
      const items = result.items;

      if (!items || items.length === 0) {
        throw new Error('لم يتم العثور على جداول بيانات واضحة في الملف');
      }
      setExtractedItems(items);
      setStep('review');
      showToast(`تم استخراج ${items.length} صنف بنجاح`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'حدث خطأ أثناء معالجة الملف', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateCell = (rowIndex: number, key: string, value: unknown) => {
    const updated = [...extractedItems];
    updated[rowIndex] = { ...updated[rowIndex], [key]: value };
    setExtractedItems(updated);
  };

  const handleRemoveRow = (row: ImportItem) => {
    const index = extractedItems.indexOf(row);
    if (index > -1) {
      setExtractedItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const downloadTemplate = async () => {
    const XLSX = await loadXLSX();
    const ws = XLSX.utils.json_to_sheet([
      {
        'اسم المنتج': 'فحمات فرامل',
        'رقم الصنف': 'BP-001',
        الشركة: 'Toyota',
        'سعر البيع': 150,
        التكلفة: 100,
        الكمية: 50,
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Inventory_Template.xlsx');
  };

  const columns =
    mode === 'invoice'
      ? [
          {
            header: 'اسم الصنف',
            accessor: (row: ImportItem) => row.name,
            isEditable: true,
            accessorKey: 'name',
          },
          {
            header: 'الكمية',
            accessor: (row: ImportItem) => row.quantity,
            isEditable: true,
            accessorKey: 'quantity',
            width: 'w-20',
          },
          {
            header: 'السعر',
            accessor: (row: ImportItem) => row.unitPrice,
            isEditable: true,
            accessorKey: 'unitPrice',
            width: 'w-24',
          },
          {
            header: 'SKU',
            accessor: (row: ImportItem) => row.sku || '---',
            isEditable: true,
            accessorKey: 'sku',
            width: 'w-24',
          },
          {
            header: 'حذف',
            accessor: (_: ImportItem) => <X size={14} />,
            width: 'w-10',
            className: 'text-center text-rose-500 cursor-pointer hover:bg-rose-50',
          },
        ]
      : [
          // Inventory Columns
          {
            header: 'اسم الصنف',
            accessor: (row: ImportItem) => row.name,
            isEditable: true,
            accessorKey: 'name',
          },
          {
            header: 'الكمية',
            accessor: (row: ImportItem) => row.stock_quantity,
            isEditable: true,
            accessorKey: 'stock_quantity',
            width: 'w-24',
          },
          {
            header: 'التكلفة',
            accessor: (row: ImportItem) => row.cost_price,
            isEditable: true,
            accessorKey: 'cost_price',
            width: 'w-24',
          },
          {
            header: 'الباركود/SKU',
            accessor: (row: ImportItem) => row.sku || '---',
            isEditable: true,
            accessorKey: 'sku',
            width: 'w-32',
          },
          {
            header: 'حذف',
            accessor: (_: ImportItem) => <X size={14} />,
            width: 'w-10',
            className: 'text-center text-rose-500 cursor-pointer hover:bg-rose-50',
          },
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
    <div className="flex w-full gap-2 border-t pt-2 dark:border-slate-800">
      <Button variant="outline" onClick={handleClose} className="flex-1">
        إلغاء
      </Button>
      {step === 'review' && (
        <Button
          onClick={() => {
            onConfirm(extractedItems);
            handleClose();
          }}
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
      <div className="flex min-h-[400px] flex-col">
        {step === 'upload' ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
            {/* Template Download Section if Inventory Mode */}
            {mode === 'inventory' && (
              <div className="mb-4 flex w-full items-center justify-between rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/30 dark:bg-blue-900/10">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="text-blue-600" size={20} />
                  <div>
                    <h4 className="text-xs font-bold text-blue-800 dark:text-blue-300">
                      نموذج الإدخال
                    </h4>
                    <p className="text-[10px] font-bold text-blue-600/70 dark:text-blue-400/60">
                      قم بتحميل القالب لتعبئة بياناتك بشكل صحيح
                    </p>
                  </div>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-1 rounded-lg border border-blue-100 bg-white px-3 py-1.5 text-[10px] font-bold shadow-sm transition-colors hover:text-blue-600 dark:border-blue-900 dark:bg-slate-800"
                >
                  <Download size={12} /> تحميل
                </button>
              </div>
            )}

            <div
              onClick={triggerFileInput}
              className={cn(
                'group flex h-64 w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-[2rem] border-2 border-dashed transition-all',
                isProcessing
                  ? 'cursor-wait border-blue-500 bg-blue-50/50'
                  : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800/50'
              )}
            >
              {isProcessing ? (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 animate-ping rounded-full bg-blue-500 opacity-20"></div>
                    <Loader2 size={48} className="relative z-10 animate-spin text-blue-600" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-bold text-gray-800 dark:text-slate-200">
                      جاري تحليل الملف...
                    </h3>
                    <p className="text-[10px] font-bold text-gray-400">
                      يقوم الذكاء الاصطناعي بقراءة البيانات وهيكلتها
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-blue-500 shadow-lg shadow-blue-500/10 transition-transform group-hover:scale-110 dark:bg-slate-800">
                    <Upload size={32} />
                  </div>
                  <div className="space-y-1 text-center">
                    <h3 className="text-lg font-bold text-gray-700 dark:text-slate-200">
                      اضغط لرفع الملف
                    </h3>
                    <p className="text-[10px] font-bold text-gray-400">
                      يدعم الصور (PNG, JPG) و PDF و Excel
                    </p>
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

            <div className="flex w-full items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-900/10">
              <Sparkles className="mt-0.5 shrink-0 text-amber-500" size={18} />
              <p className="text-[10px] font-bold leading-relaxed text-amber-800 dark:text-amber-400">
                النظام يستخدم نموذج Gemini 2.5 Flash للتعرف الذكي على الحقول حتى لو اختلفت المسميات
                (مثلاً: "العدد" سيفهم أنها "الكمية").
              </p>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-slate-100">
                <CheckCircle className="text-emerald-500" size={16} />
                البيانات المستخرجة
              </h3>
              <button
                onClick={resetModal}
                className="text-[10px] font-bold text-blue-600 hover:underline"
              >
                إعادة الرفع
              </button>
            </div>

            <div className="flex-1 overflow-hidden rounded-2xl border-2 border-gray-100 bg-[var(--app-surface)] dark:border-slate-800">
              <ExcelTable
                columns={columns}
                data={extractedItems}
                onCellUpdate={(rowIndex, key, val) => {
                  handleUpdateCell(rowIndex, key, val);
                }}
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
