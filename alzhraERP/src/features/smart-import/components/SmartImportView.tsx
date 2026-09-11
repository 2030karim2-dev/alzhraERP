import React, { useState, useRef, useEffect } from 'react';
import {
  Loader2,
  Sparkles,
  X,
  ArrowRight,
  RefreshCw,
  Warehouse,
  DollarSign,
  ScanLine,
  User,
  Image as _ImageIcon,
} from 'lucide-react';
import Button from '../../../ui/base/Button';
import { documentAiService } from '../../ai/documentService';
import ExcelTable from '../../../ui/common/ExcelTable';
import { useFeedbackStore } from '../../feedback/store';
import { useCurrencies } from '../../settings/hooks';
import { useWarehouses } from '../../inventory/hooks/useInventoryManagement';
import { cn } from '../../../core/utils';

export interface ExtractedItem {
  name?: string;
  brand?: string;
  partNumber?: string;
  quantity?: number;
  stock_quantity?: number;
  unitPrice?: number;
  cost_price?: number;
  warehouse_id?: string;
  [key: string]: unknown;
}

interface Props {
  mode: 'invoice' | 'inventory';
  onConfirm: (data: { items: ExtractedItem[]; supplierName?: string; currency?: string }) => void;
}

const SmartImportView: React.FC<Props> = ({ mode, onConfirm }) => {
  const { showToast } = useFeedbackStore();
  const { currencies } = useCurrencies();
  const { data: warehouses } = useWarehouses();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);

  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [detectedSupplier, setDetectedSupplier] = useState<string>('');
  const [_filePreview, setFilePreview] = useState<string | null>(null);
  const [_isImageVisible, _setIsImageVisible] = useState(true);

  const [detectedCurrency, setDetectedCurrency] = useState<string>('SAR');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');

  useEffect(() => {
    // Auto-select first warehouse
    if (warehouses && warehouses.length > 0 && !selectedWarehouseId) {
      const whArray = warehouses as Array<{ id: string }>;
      setSelectedWarehouseId(whArray[0]?.id);
    }
  }, [warehouses, selectedWarehouseId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => {
        setFilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }

    setIsProcessing(true);
    try {
      const result = await documentAiService.parseDocument(file, mode);
      if (!result.items || result.items.length === 0) {
        throw new Error('لم يتم العثور على بيانات. يرجى التأكد من وضوح الفاتورة.');
      }
      setExtractedItems(result.items);
      setDetectedSupplier(result.supplierName || '');
      setDetectedCurrency(result.currency.toUpperCase());
      setStep('review');
      showToast(`تم استخراج ${result.items.length} صنف بنجاح`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unknown error', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (extractedItems.length === 0) return;
    onConfirm({
      items: extractedItems.map(item => ({ ...item, warehouse_id: selectedWarehouseId })),
      supplierName: detectedSupplier,
      currency: detectedCurrency,
    });
  };

  const columns =
    mode === 'invoice'
      ? [
          {
            header: 'اسم القطعة',
            accessor: (row: ExtractedItem) => row.name,
            isEditable: true,
            accessorKey: 'name',
          },
          {
            header: 'الشركة الصانعة',
            accessor: (row: ExtractedItem) => row.brand || '-',
            isEditable: true,
            accessorKey: 'brand',
            width: '120px',
            className: 'text-blue-600 font-bold',
          },
          {
            header: 'رقم القطعة',
            accessor: (row: ExtractedItem) => row.partNumber || '-',
            isEditable: true,
            accessorKey: 'partNumber',
            width: '140px',
            className: 'font-mono text-[10px]',
          },
          {
            header: 'الكمية',
            accessor: (row: ExtractedItem) => row.quantity,
            isEditable: true,
            accessorKey: 'quantity',
            width: '80px',
            className: 'text-center font-mono',
            footer: (data: ExtractedItem[]) => (
              <span className="font-mono font-bold">
                {data.reduce((s, r) => s + (Number(r.quantity) || 0), 0)}
              </span>
            ),
          },
          {
            header: `السعر (${detectedCurrency})`,
            accessor: (row: ExtractedItem) => (
              <span className="flex items-center justify-center gap-1">
                <span className="font-mono">{row.unitPrice}</span>
                <span className="rounded bg-amber-100 px-1 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  {detectedCurrency}
                </span>
              </span>
            ),
            isEditable: true,
            accessorKey: 'unitPrice',
            width: '120px',
            className: 'text-rose-600 font-bold font-mono',
          },
          {
            header: `الإجمالي (${detectedCurrency})`,
            accessor: (row: ExtractedItem) =>
              ((Number(row.quantity) || 0) * (Number(row.unitPrice) || 0)).toFixed(2),
            width: '140px',
            className:
              'bg-emerald-50/50 dark:bg-emerald-900/10 font-mono text-center font-bold text-emerald-700 dark:text-emerald-400',
            footer: (data: ExtractedItem[]) => (
              <span className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400">
                {data
                  .reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0), 0)
                  .toFixed(2)}{' '}
                {detectedCurrency}
              </span>
            ),
          },
          {
            header: ' ',
            accessor: (row: ExtractedItem) => (
              <button
                onClick={() => {
                  setExtractedItems(prev => prev.filter(i => i !== row));
                }}
                className="rounded p-1 text-rose-400 hover:bg-rose-50"
              >
                <X size={12} />
              </button>
            ),
            width: '40px',
          },
        ]
      : [
          {
            header: 'اسم الصنف',
            accessor: (row: ExtractedItem) => row.name,
            isEditable: true,
            accessorKey: 'name',
          },
          {
            header: 'الشركة الصانعة',
            accessor: (row: ExtractedItem) => row.brand || '-',
            isEditable: true,
            accessorKey: 'brand',
            width: '120px',
          },
          {
            header: 'رقم القطعة',
            accessor: (row: ExtractedItem) => row.partNumber || '-',
            isEditable: true,
            accessorKey: 'partNumber',
            width: '140px',
          },
          {
            header: 'الكمية',
            accessor: (row: ExtractedItem) => row.stock_quantity,
            isEditable: true,
            accessorKey: 'stock_quantity',
            width: '90px',
            footer: (data: ExtractedItem[]) => (
              <span className="font-mono font-bold">
                {data.reduce((s, r) => s + (Number(r.stock_quantity) || 0), 0)}
              </span>
            ),
          },
          {
            header: `التكلفة (${detectedCurrency})`,
            accessor: (row: ExtractedItem) => (
              <span className="flex items-center justify-center gap-1">
                <span className="font-mono">{row.cost_price}</span>
                <span className="rounded bg-amber-100 px-1 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  {detectedCurrency}
                </span>
              </span>
            ),
            isEditable: true,
            accessorKey: 'cost_price',
            width: '120px',
          },
          {
            header: ' ',
            accessor: (row: ExtractedItem) => (
              <button
                onClick={() => {
                  setExtractedItems(prev => prev.filter(i => i !== row));
                }}
                className="rounded p-1 text-rose-400 hover:bg-rose-50"
              >
                <X size={12} />
              </button>
            ),
            width: '40px',
          },
        ];

  return (
    <div className="animate-in fade-in font-cairo flex h-full flex-col gap-4 duration-500">
      {step === 'upload' ? (
        <div className="flex flex-1 items-center justify-center p-4">
          <div
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={cn(
              'group relative flex h-96 w-full max-w-2xl cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[2.5rem] border-2 border-dashed bg-[var(--app-surface)] shadow-2xl shadow-blue-500/5 transition-all',
              isProcessing
                ? 'cursor-wait border-blue-500 bg-blue-50/10'
                : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50 dark:border-slate-800'
            )}
          >
            {isProcessing ? (
              <div className="flex flex-col items-center gap-6">
                <div className="relative">
                  <div className="absolute inset-0 animate-ping rounded-full bg-blue-500 opacity-20"></div>
                  <Loader2 size={64} className="relative z-10 animate-spin text-blue-600" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold">جاري الاستخراج الذكي للأصناف...</h3>
                  <p className="mt-2 text-xs font-bold text-gray-400">
                    جاري معالجة الماركات وأرقام القطع...
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-blue-100 bg-blue-50 text-blue-600 transition-transform group-hover:scale-110 dark:bg-slate-800">
                  <ScanLine size={40} />
                </div>
                <div className="space-y-2 text-center">
                  <h3 className="text-2xl font-bold">الاستيراد الذكي للبيانات</h3>
                  <p className="mx-auto max-w-xs text-xs font-bold text-gray-400">
                    ارفع صورة الفاتورة لاستخراج كافة الأصناف، الشركات الصانعة، والمورد آلياً.
                  </p>
                </div>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={handleFileSelect}
              disabled={isProcessing}
            />
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-gray-200 bg-[var(--app-surface)] shadow-sm dark:border-slate-800">
          <div className="z-20 flex shrink-0 flex-wrap items-center justify-between gap-2 bg-slate-900 px-4 py-2 text-white">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-600 p-1 shadow-lg">
                <Sparkles size={14} />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-tight">مراجعة البيانات</h3>
                <div className="flex items-center gap-2">
                  <User size={12} className="text-blue-400" />
                  <input
                    value={detectedSupplier}
                    onChange={e => {
                      setDetectedSupplier(e.target.value);
                    }}
                    placeholder="المورد..."
                    className="w-36 border-none bg-transparent text-xs font-bold text-gray-200 outline-none focus:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="flex items-center rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1">
                <DollarSign size={12} className="text-emerald-400" />
                <select
                  value={detectedCurrency}
                  onChange={e => {
                    setDetectedCurrency(e.target.value);
                  }}
                  className="cursor-pointer appearance-none bg-transparent text-xs font-bold text-white outline-none"
                >
                  {currencies.data?.map((c: { code: string }) => (
                    <option key={c.code} value={c.code}>
                      {c.code}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1">
                <Warehouse size={12} className="text-blue-400" />
                <select
                  value={selectedWarehouseId}
                  onChange={e => {
                    setSelectedWarehouseId(e.target.value);
                  }}
                  className="max-w-[110px] cursor-pointer appearance-none bg-transparent text-xs font-bold text-white outline-none"
                >
                  {warehouses?.map((w: any) => (
                    <option key={w.id} value={w.id}>
                      {w.name || w.name_ar}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex min-h-[480px] flex-1 flex-col overflow-hidden bg-slate-50 p-2 dark:bg-slate-950/50">
            <ExcelTable
              columns={columns}
              data={extractedItems}
              title={`الأصناف المستخرجة — ${extractedItems.length} صنف`}
              subtitle={`المورد: ${detectedSupplier || 'غير محدد'} • العملة: ${detectedCurrency}`}
              colorTheme="blue"
              enablePagination={false}
              showSearch={true}
              emptyMessage="لم يتم استخراج أي أصناف. يرجى رفع صورة فاتورة واضحة."
              onCellUpdate={async (rowIndex: number, accessorKey: string, value: any) => {
                setExtractedItems(prev => {
                  const updated = [...prev];
                  const key = accessorKey as keyof ExtractedItem;
                  if (
                    key === 'quantity' ||
                    key === 'stock_quantity' ||
                    key === 'unitPrice' ||
                    key === 'cost_price'
                  ) {
                    (updated[rowIndex] as any)[key] = parseFloat(value) || 0;
                  } else {
                    (updated[rowIndex] as any)[key] = value;
                  }
                  return updated;
                });
              }}
            />
          </div>

          <div className="flex items-center justify-between border-t bg-[var(--app-surface)] p-3 dark:border-slate-800">
            <Button
              variant="outline"
              onClick={() => {
                setStep('upload');
                setExtractedItems([]);
                setFilePreview(null);
              }}
              size="sm"
              className="rounded-xl"
            >
              <RefreshCw size={14} /> مسح وإعادة
            </Button>
            <div className="flex items-center gap-4">
              <div className="hidden text-right sm:block">
                <span className="block text-[10px] font-bold uppercase text-gray-400">
                  عدد الأصناف
                </span>
                <span className="text-sm font-bold text-blue-600">{extractedItems.length}</span>
              </div>
              <Button
                onClick={handleConfirm}
                variant="success"
                size="md"
                className="rounded-xl shadow-lg shadow-emerald-500/20"
                leftIcon={<ArrowRight size={16} />}
              >
                {mode === 'invoice' ? 'نقل البيانات للفاتورة' : 'اعتماد الكميات في المخزن'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartImportView;
