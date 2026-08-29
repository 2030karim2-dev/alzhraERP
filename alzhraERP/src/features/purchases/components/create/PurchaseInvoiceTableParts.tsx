import React from 'react';
import type { PurchaseInvoiceItem } from '../../store';
import type { Product } from '../../../inventory/types';
import { Settings } from 'lucide-react';
import { cn } from '../../../../core/utils';
import { PurchaseProductCell, PurchaseNumericCell, PurchaseTotalCell, PurchaseRemoveCell } from './PurchaseInvoiceCells';

type ColumnWidths = Record<string, number>;
interface TableHeaderProps { colWidths: ColumnWidths; showDiscount: boolean; onResizeMouseDown: (event: React.MouseEvent<HTMLElement>, field: string) => void; }

const ResizeHandle: React.FC<{ field: string; onResizeMouseDown: TableHeaderProps['onResizeMouseDown'] }> = ({ field, onResizeMouseDown }) => (
    <button type="button" aria-label={`تغيير عرض عمود ${field}`} onMouseDown={(event) => { onResizeMouseDown(event, field); }} className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-300 transition-colors z-20" />
);

export const PurchaseTableToolbar: React.FC<{ discountEnabled: boolean; showDiscount: boolean; onToggleDiscount: () => void }> = ({ discountEnabled, showDiscount, onToggleDiscount }) => (
    <div className="p-1.5 max-md:p-0.5 flex justify-end gap-2 max-md:gap-1 bg-blue-600 dark:bg-slate-950 border-b dark:border-slate-800">
        <div className="flex bg-white/10 p-0.5 rounded-none border border-white/20">
            {discountEnabled && <button onClick={onToggleDiscount} className={cn("px-3 max-md:px-1.5 py-1 max-md:py-0.5 text-[10px] max-md:text-[10px] font-bold uppercase transition-all", showDiscount ? "bg-white text-blue-600" : "text-blue-100")}>إظهار الخصم</button>}
        </div>
        <div className="p-1.5 max-md:p-0.5 text-white/50"><Settings size={14} className="max-md:w-3 max-md:h-3" /></div>
    </div>
);

export const PurchaseTableHeader: React.FC<TableHeaderProps> = ({ colWidths, showDiscount, onResizeMouseDown }) => (
    <thead><tr className="bg-blue-600 text-[10px] max-md:text-[10px] font-black text-white uppercase tracking-widest text-right">
        <th style={{ width: colWidths.index }} className="relative p-2 max-md:p-1 text-center border-l border-white/10 max-md:hidden">#</th>
        <th style={{ width: colWidths.name }} className="relative p-2 max-md:p-0.5 border-l border-white/10 pr-4 max-md:pr-1 max-md:!w-[34%]">وصف الصنف المورد <ResizeHandle field="name" onResizeMouseDown={onResizeMouseDown} /></th>
        <th style={{ width: colWidths.partNumber }} className="relative p-2 max-md:p-1 text-center border-l border-white/10 max-md:hidden">رقم القطعة <ResizeHandle field="partNumber" onResizeMouseDown={onResizeMouseDown} /></th>
        <th style={{ width: colWidths.brand }} className="relative p-2 max-md:p-1 text-center border-l border-white/10 max-md:hidden">الشركة الصانعة <ResizeHandle field="brand" onResizeMouseDown={onResizeMouseDown} /></th>
        <th style={{ width: colWidths.quantity }} className="relative p-2 max-md:p-0.5 text-center border-l border-white/10 max-md:!w-[16%]">الكمية <ResizeHandle field="quantity" onResizeMouseDown={onResizeMouseDown} /></th>
        <th style={{ width: colWidths.costPrice }} className="relative p-2 max-md:p-0.5 text-center border-l border-white/10 max-md:!w-[18%]">سعر التكلفة <ResizeHandle field="costPrice" onResizeMouseDown={onResizeMouseDown} /></th>
        {showDiscount && <th style={{ width: colWidths.discount }} className="relative p-2 max-md:p-0.5 text-center border-l border-white/10 max-md:!w-[15%]">الخصم <ResizeHandle field="discount" onResizeMouseDown={onResizeMouseDown} /></th>}
        <th style={{ width: colWidths.total }} className="relative p-2 max-md:p-0.5 text-left pr-4 max-md:pr-1 max-md:!w-[18%]">الإجمالي <ResizeHandle field="total" onResizeMouseDown={onResizeMouseDown} /></th>
        <th className="p-2 max-md:p-0.5 w-8 max-md:w-6 text-center bg-blue-700" />
    </tr></thead>
);

interface TableBodyProps { items: PurchaseInvoiceItem[]; showDiscount: boolean; onOpenSearch: (index: number, query?: string) => void; onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>, index: number, field: keyof PurchaseInvoiceItem) => void; onUpdate: (index: number, field: keyof PurchaseInvoiceItem, value: number) => void; onRemove: (index: number) => void; }
export const PurchaseTableBody: React.FC<TableBodyProps> = ({ items, showDiscount, onOpenSearch, onKeyDown, onUpdate, onRemove }) => (
    <tbody className="divide-y dark:divide-slate-800">{items.map((item, index) => <tr key={item.id} className="group h-9 max-md:h-7 hover:bg-blue-50 dark:hover:bg-blue-900/5 transition-colors">
        <td className="p-2 max-md:p-1 text-center text-[10px] max-md:text-[10px] font-mono font-bold text-blue-300 border-l dark:border-slate-800 max-md:hidden">{index + 1}</td>
        <PurchaseProductCell item={item} index={index} onOpenSearch={onOpenSearch} onKeyDown={onKeyDown} />
        <td className="p-2 max-md:p-1 text-center text-[10px] font-mono font-bold text-gray-500 max-md:hidden">{item.partNumber || '---'}</td>
        <td className="p-2 max-md:p-1 text-center text-[10px] font-bold text-blue-600 max-md:hidden">{item.brand || '---'}</td>
        <PurchaseNumericCell value={item.quantity} field="quantity" index={index} onChange={onUpdate} onKeyDown={onKeyDown} placeholder="0" className="focus:bg-blue-50 dark:focus:bg-slate-800" />
        <PurchaseNumericCell value={item.costPrice} field="costPrice" index={index} onChange={onUpdate} onKeyDown={onKeyDown} placeholder="0.00" className="text-rose-600 focus:bg-rose-50 dark:focus:bg-slate-800" />
        {showDiscount && <PurchaseNumericCell value={item.discount} field="discount" index={index} onChange={onUpdate} onKeyDown={onKeyDown} className="focus:bg-amber-50 dark:focus:bg-slate-800" />}
        <PurchaseTotalCell item={item} showDiscount={showDiscount} /><PurchaseRemoveCell onRemove={() => { onRemove(index); }} />
    </tr>)}</tbody>
);

export type PurchaseProductSelectionHandler = (product: Product) => void;
