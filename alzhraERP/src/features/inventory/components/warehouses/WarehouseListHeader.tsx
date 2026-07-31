import React from 'react';
import { Warehouse, Maximize2 } from 'lucide-react';
import Button from '../../../../ui/base/Button';

interface Props {
    isMaximized: boolean;
    onMaximize: () => void;
    onAddWarehouse: () => void;
}

const WarehouseListHeader: React.FC<Props> = ({ isMaximized, onMaximize, onAddWarehouse }) => {
    return (
        <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-none border border-gray-100 dark:border-slate-800 shadow-sm shrink-0">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/10 text-blue-600 rounded-lg">
                    <Warehouse size={18} />
                </div>
                <div>
                    <h2 className="text-sm font-bold text-gray-800 dark:text-white leading-none">إدارة المستودعات والفروع</h2>
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">عرض جميع المستودعات وحالة المخزون بها</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {!isMaximized && (
                    <button
                        onClick={onMaximize}
                        className="h-8 px-3 bg-white dark:bg-slate-800 text-gray-400 border border-gray-100 dark:border-slate-800 rounded-lg font-bold text-[10px] shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                        title="Full Screen"
                    >
                        <Maximize2 size={14} />
                        <span className="hidden sm:inline">تكبير</span>
                    </button>
                )}
                <Button
                    onClick={onAddWarehouse}
                    className="h-8 px-4 rounded-lg font-bold text-[10px] shadow-md shadow-blue-500/10"
                >
                    إضافة مستودع
                </Button>
            </div>
        </div>
    );
};

export default WarehouseListHeader;
