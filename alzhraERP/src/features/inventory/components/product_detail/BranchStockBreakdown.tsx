import React, { useMemo } from 'react';
import { Store, Warehouse, MapPin, Building2, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { cn, formatNumberDisplay } from '../../../../core/utils';
import { warehouseStock } from '../../types';

interface BranchInfo {
    id: string;
    name: string;
    warehouses: {
        id: string;
        name: string;
        quantity: number;
        location: string | null;
    }[];
}

interface Props {
    warehouseDistribution: warehouseStock[];
    /** Optional branch list to group warehouses */
    branches?: BranchInfo[];
    /** Total stock across all warehouses */
    totalStock?: number;
    /** Min stock level for indicator */
    minStockLevel?: number;
}

const BranchStockBreakdown: React.FC<Props> = ({
    warehouseDistribution,
    branches,
    totalStock,
    minStockLevel = 0,
}) => {
    const [expandedBranches, setExpandedBranches] = React.useState<Set<string>>(new Set());

    const toggleBranch = (branchId: string) => {
        setExpandedBranches(prev => {
            const next = new Set(prev);
            if (next.has(branchId)) next.delete(branchId);
            else next.add(branchId);
            return next;
        });
    };

    // If no branches data, show flat list
    if (!branches || branches.length === 0) {
        return (
            <div className="space-y-2">
                {warehouseDistribution.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                        <Warehouse size={24} className="mx-auto mb-2 opacity-40" />
                        <p className="text-xs font-bold">لا توجد مستودعات مسجلة</p>
                    </div>
                ) : (
                    warehouseDistribution.map((wh, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-800 transition-all group"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                    <Warehouse size={14} className="text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                        {wh.warehouse_name}
                                    </p>
                                    {wh.location && (
                                        <p className="text-[9px] text-slate-500 flex items-center gap-1 mt-0.5">
                                            <MapPin size={8} />
                                            {wh.location}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className={cn(
                                    "font-mono font-black text-sm px-2.5 py-1 rounded-lg",
                                    wh.quantity > minStockLevel
                                        ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400'
                                        : wh.quantity > 0
                                            ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400'
                                            : 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400'
                                )}>
                                    {formatNumberDisplay(wh.quantity)}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        );
    }

    // Grouped by branch
    const totalQuantity = warehouseDistribution.reduce((sum, wh) => sum + wh.quantity, 0);

    return (
        <div className="space-y-2">
            {/* Stock Progress Bar */}
            {totalStock !== undefined && (
                <div className="px-1 mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-slate-500">نسبة المخزون</span>
                        <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400">
                            {totalStock} / {minStockLevel > 0 ? minStockLevel : '—'} حد أدنى
                        </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all duration-500",
                                totalStock > minStockLevel * 2
                                    ? 'bg-emerald-500'
                                    : totalStock > 0
                                        ? 'bg-amber-500'
                                        : 'bg-rose-500'
                            )}
                            style={{
                                width: `${Math.min(
                                    (totalStock / (minStockLevel * 3 || totalStock || 1)) * 100,
                                    100
                                )}%`
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Branch List */}
            <div className="space-y-1.5">
                {branches.map((branch) => {
                    const branchTotal = branch.warehouses.reduce((sum, w) => sum + w.quantity, 0);
                    const isExpanded = expandedBranches.has(branch.id);

                    return (
                        <div key={branch.id} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-all">
                            {/* Branch Header */}
                            <button
                                type="button"
                                onClick={() => toggleBranch(branch.id)}
                                className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                                        <Building2 size={14} className="text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div className="text-right min-w-0">
                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                            {branch.name}
                                        </p>
                                        <p className="text-[9px] text-slate-500">
                                            {branch.warehouses.length} مستودع
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-800">
                                        {formatNumberDisplay(branchTotal)}
                                    </span>
                                    {isExpanded ? (
                                        <ChevronUp size={14} className="text-slate-400" />
                                    ) : (
                                        <ChevronDown size={14} className="text-slate-400" />
                                    )}
                                </div>
                            </button>

                            {/* Warehouse List */}
                            {isExpanded && (
                                <div className="divide-y divide-slate-100 dark:divide-slate-800 animate-in slide-in-from-top-1 duration-150">
                                    {branch.warehouses.length === 0 ? (
                                        <div className="p-3 text-center text-[10px] text-slate-400">
                                            لا يوجد مستودعات في هذا الفرع
                                        </div>
                                    ) : (
                                        branch.warehouses.map((wh, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between p-2.5 pr-12 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <Warehouse size={11} className="text-slate-400 shrink-0" />
                                                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                                                        {wh.name}
                                                    </span>
                                                    {wh.location && (
                                                        <span className="text-[8px] text-slate-400 hidden md:inline">
                                                            ({wh.location})
                                                        </span>
                                                    )}
                                                </div>
                                                <span className={cn(
                                                    "font-mono font-bold text-[11px]",
                                                    wh.quantity > 0
                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                        : 'text-rose-400 dark:text-rose-500'
                                                )}>
                                                    {formatNumberDisplay(wh.quantity)}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-l from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-200 dark:border-blue-800 mt-3">
                <div className="flex items-center gap-2">
                    <Layers size={14} className="text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-bold text-blue-800 dark:text-blue-300">الإجمالي الكلي</span>
                </div>
                <span className="font-mono font-black text-sm text-blue-700 dark:text-blue-300">
                    {formatNumberDisplay(totalQuantity)}
                </span>
            </div>
        </div>
    );
};

export default BranchStockBreakdown;