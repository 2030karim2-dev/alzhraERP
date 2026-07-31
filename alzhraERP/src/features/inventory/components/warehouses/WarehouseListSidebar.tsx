import React from 'react';
import { Warehouse, Plus } from 'lucide-react';
import { formatCurrency, formatNumberDisplay } from '../../../../core/utils';
import { cn } from '../../../../core/utils';
import Button from '../../../../ui/base/Button';

interface Props {
    warehouses: any[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onAdd: () => void;
}

const WarehouseListSidebar: React.FC<Props> = ({ warehouses, selectedId, onSelect, onAdd }) => {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-none border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col">
            <div className="p-3 border-b dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Warehouse size={14} className="text-blue-500" />
                    <h3 className="text-xs font-bold text-gray-700 dark:text-slate-200">الفروع والمستودعات</h3>
                </div>
                <Button onClick={onAdd} size="sm" className="rounded-md h-7 w-7 p-0 !gap-0">
                    <Plus size={12} />
                </Button>
            </div>
            <div className="flex flex-col max-h-[70vh] overflow-y-auto custom-scrollbar">
                {warehouses.map(wh => (
                    <button
                        key={wh.id}
                        onClick={() => onSelect(wh.id)}
                        className={cn(
                            "text-right p-3 border-b dark:border-slate-800 transition-all group relative overflow-hidden",
                            selectedId === wh.id ? "bg-blue-600 text-white" : "hover:bg-gray-50/50 dark:hover:bg-slate-800/50"
                        )}
                    >
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold uppercase tracking-tighter">{wh.name_ar}</h4>
                            </div>
                            <span dir="ltr" className={cn("text-lg font-bold font-mono leading-none transition-colors", selectedId === wh.id ? "text-blue-300" : "text-emerald-600 dark:text-emerald-400")}>
                                {formatCurrency(Number(wh.stockValue || 0))}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-[9px] font-bold">
                            <span className={cn(selectedId === wh.id ? "text-blue-200" : "text-gray-400")}>{wh.location || '---'}</span>
                            <div className="flex gap-3 font-mono">
                                <span><b className={cn(selectedId === wh.id ? "text-white" : "text-gray-700 dark:text-slate-100")}>{formatNumberDisplay(Number(wh.itemCount || 0))}</b> صنف</span>
                                <span><b className={cn(selectedId === wh.id ? "text-white" : "text-gray-700 dark:text-slate-100")}>{formatNumberDisplay(Number(wh.totalStock || 0))}</b> قطعة</span>
                            </div>
                        </div>
                        {selectedId === wh.id && <div className="absolute top-0 right-0 h-full w-1 bg-amber-400"></div>}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default WarehouseListSidebar;
