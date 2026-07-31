import React, { useState, useRef, useEffect } from 'react';
import {
    Loader2, Sparkles, X,
    ArrowRight, RefreshCw, Warehouse,
    DollarSign, ScanLine, User, Image as _ImageIcon,
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
    onConfirm: (data: { items: ExtractedItem[], supplierName?: string, currency?: string }) => void;
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
            reader.onload = (e) => { setFilePreview(e.target?.result as string); };
            reader.readAsDataURL(file);
        }

        setIsProcessing(true);
        try {
            const result = await documentAiService.parseDocument(file, mode);
            if (!result.items || result.items.length === 0) {
                throw new Error("لم يتم العثور على بيانات. يرجى التأكد من وضوح الفاتورة.");
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
            currency: detectedCurrency
        });
    };

    const columns = mode === 'invoice' ? [
        { header: 'اسم القطعة', accessor: (row: ExtractedItem) => row.name, isEditable: true, accessorKey: 'name' },
        { header: 'الشركة الصانعة', accessor: (row: ExtractedItem) => row.brand || '-', isEditable: true, accessorKey: 'brand', width: 'w-28', className: 'text-blue-600 font-bold' },
        { header: 'رقم القطعة', accessor: (row: ExtractedItem) => row.partNumber || '-', isEditable: true, accessorKey: 'partNumber', width: 'w-32', className: 'font-mono text-[10px]' },
        {
            header: 'الكمية', accessor: (row: ExtractedItem) => row.quantity, isEditable: true, accessorKey: 'quantity', width: 'w-16', className: 'text-center font-mono',
            footer: (data: ExtractedItem[]) => <span className="font-bold font-mono">{data.reduce((s, r) => s + (Number(r.quantity) || 0), 0)}</span>
        },
        {
            header: `السعر (${detectedCurrency})`,
            accessor: (row: ExtractedItem) => <span className="flex items-center gap-1 justify-center"><span className="font-mono">{row.unitPrice}</span><span className="text-[8px] px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-bold">{detectedCurrency}</span></span>,
            isEditable: true, accessorKey: 'unitPrice', width: 'w-28', className: 'text-rose-600 font-bold font-mono',
            footer: (data: ExtractedItem[]) => <span className="font-bold font-mono text-rose-600">{data.reduce((s, r) => s + (Number(r.unitPrice) || 0), 0).toFixed(2)}</span>
        },
        {
            header: `الإجمالي (${detectedCurrency})`,
            accessor: (row: ExtractedItem) => ((Number(row.quantity) || 0) * (Number(row.unitPrice) || 0)).toFixed(2),
            width: 'w-28', className: 'bg-emerald-50/50 dark:bg-emerald-900/10 font-mono text-center font-bold text-emerald-700 dark:text-emerald-400',
            footer: (data: ExtractedItem[]) => <span className="font-bold font-mono text-emerald-700 dark:text-emerald-400 text-sm">{data.reduce((s, r) => s + ((Number(r.quantity) || 0) * (Number(r.unitPrice) || 0)), 0).toFixed(2)} {detectedCurrency}</span>
        },
        {
            header: ' ',
            accessor: (row: ExtractedItem) => <button onClick={() => { setExtractedItems(prev => prev.filter(i => i !== row)); }} className="p-1 hover:bg-rose-50 rounded text-rose-400"><X size={12} /></button>,
            width: 'w-8'
        }
    ] : [
        { header: 'اسم الصنف', accessor: (row: ExtractedItem) => row.name, isEditable: true, accessorKey: 'name' },
        { header: 'الشركة الصانعة', accessor: (row: ExtractedItem) => row.brand || '-', isEditable: true, accessorKey: 'brand', width: 'w-28' },
        { header: 'رقم القطعة', accessor: (row: ExtractedItem) => row.partNumber || '-', isEditable: true, accessorKey: 'partNumber', width: 'w-32' },
        {
            header: 'الكمية', accessor: (row: ExtractedItem) => row.stock_quantity, isEditable: true, accessorKey: 'stock_quantity', width: 'w-20',
            footer: (data: ExtractedItem[]) => <span className="font-bold font-mono">{data.reduce((s, r) => s + (Number(r.stock_quantity) || 0), 0)}</span>
        },
        {
            header: `التكلفة (${detectedCurrency})`,
            accessor: (row: ExtractedItem) => <span className="flex items-center gap-1 justify-center"><span className="font-mono">{row.cost_price}</span><span className="text-[8px] px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-bold">{detectedCurrency}</span></span>,
            isEditable: true, accessorKey: 'cost_price', width: 'w-28',
            footer: (data: ExtractedItem[]) => <span className="font-bold font-mono text-rose-600">{data.reduce((s, r) => s + (Number(r.cost_price) || 0), 0).toFixed(2)}</span>
        },
        {
            header: ' ',
            accessor: (row: ExtractedItem) => <button onClick={() => { setExtractedItems(prev => prev.filter(i => i !== row)); }} className="p-1 hover:bg-rose-50 rounded text-rose-400"><X size={12} /></button>,
            width: 'w-8'
        }
    ];

    return (
        <div className="h-full flex flex-col gap-4 animate-in fade-in duration-500 font-cairo">
            {step === 'upload' ? (
                <div className="flex-1 flex items-center justify-center p-4">
                    <div
                        onClick={() => !isProcessing && fileInputRef.current?.click()}
                        className={cn(
                            "relative w-full max-w-2xl h-96 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group bg-white dark:bg-slate-900 shadow-2xl shadow-blue-500/5",
                            isProcessing ? "border-blue-500 bg-blue-50/10 cursor-wait" : "border-gray-200 dark:border-slate-800 hover:border-blue-400 hover:bg-gray-50"
                        )}
                    >
                        {isProcessing ? (
                            <div className="flex flex-col items-center gap-6">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20"></div>
                                    <Loader2 size={64} className="text-blue-600 animate-spin relative z-10" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-xl font-bold">جاري الاستخراج الذكي للأصناف...</h3>
                                    <p className="text-xs text-gray-400 font-bold mt-2 uppercase tracking-widest">Processing brands and part numbers</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="w-24 h-24 bg-blue-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center text-blue-600 border border-blue-100 mb-6 group-hover:scale-110 transition-transform">
                                    <ScanLine size={40} />
                                </div>
                                <div className="text-center space-y-2">
                                    <h3 className="text-2xl font-bold">الاستيراد الذكي للبيانات</h3>
                                    <p className="text-xs font-bold text-gray-400 max-w-xs mx-auto">ارفع صورة الفاتورة لاستخراج كافة الأصناف، الشركات الصانعة، والمورد آلياً.</p>
                                </div>
                            </>
                        )}
                        <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileSelect} disabled={isProcessing} />
                    </div>
                </div>
            ) : (
                <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-[1.5rem] border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="bg-slate-900 text-white px-4 py-2 flex flex-wrap justify-between items-center gap-2 z-20 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-1 bg-blue-600 rounded-lg shadow-lg"><Sparkles size={14} /></div>
                            <div>
                                <h3 className="text-[10px] font-black uppercase tracking-tight">مراجعة البيانات</h3>
                                <div className="flex items-center gap-2">
                                    <User size={8} className="text-blue-400" />
                                    <input
                                        value={detectedSupplier}
                                        onChange={(e) => { setDetectedSupplier(e.target.value); }}
                                        placeholder="المورد..."
                                        className="bg-transparent text-[8px] font-black text-gray-300 border-none outline-none focus:text-white w-32"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <div className="flex items-center bg-slate-800 rounded-lg px-2 py-1 border border-slate-700">
                                <DollarSign size={10} className="text-emerald-400" />
                                <select value={detectedCurrency} onChange={(e) => { setDetectedCurrency(e.target.value); }} className="bg-transparent text-[9px] font-black text-white outline-none appearance-none cursor-pointer">
                                    {currencies.data?.map((c: { code: string }) => <option key={c.code} value={c.code}>{c.code}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center bg-slate-800 rounded-lg px-2 py-1 border border-slate-700">
                                <Warehouse size={10} className="text-blue-400" />
                                <select value={selectedWarehouseId} onChange={(e) => { setSelectedWarehouseId(e.target.value); }} className="bg-transparent text-[9px] font-black text-white outline-none appearance-none cursor-pointer max-w-[80px]">
                                    {warehouses?.map((w: any) => <option key={w.id} value={w.id}>{w.name || w.name_ar}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950/50 custom-scrollbar p-2">
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
                                const updated = [...extractedItems];
                                const key = accessorKey as keyof ExtractedItem;
                                if (key === 'quantity' || key === 'stock_quantity' || key === 'unitPrice' || key === 'cost_price') {
                                    (updated[rowIndex] as any)[key] = parseFloat(value) || 0;
                                } else {
                                    (updated[rowIndex] as any)[key] = value;
                                }
                                setExtractedItems(updated);
                            }}
                        />
                    </div>

                    <div className="p-3 border-t dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center">
                        <Button variant="outline" onClick={() => { setStep('upload'); setExtractedItems([]); setFilePreview(null); }} size="sm" className="rounded-xl"><RefreshCw size={14} /> مسح وإعادة</Button>
                        <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                                <span className="text-[8px] font-bold text-gray-400 block uppercase">عدد الأصناف</span>
                                <span className="text-sm font-bold text-blue-600">{extractedItems.length}</span>
                            </div>
                            <Button onClick={handleConfirm} variant="success" size="md" className="rounded-xl shadow-lg shadow-emerald-500/20" leftIcon={<ArrowRight size={16} />}>
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