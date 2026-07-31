import React from 'react';
import { Building2, Phone, MapPin, Hash, Package, TrendingUp, Loader2, ExternalLink } from 'lucide-react';
import { cn } from '../../../../core/utils';

interface SupplierData {
    id: string;
    name: string;
    phone?: string | null;
    address?: string | null;
    supplier_code?: string | null;
    email?: string | null;
}

interface RecentPurchase {
    date: string;
    quantity: number;
    unit_price: number;
    total: number;
}

interface Props {
    supplierName: string;
    supplierData?: SupplierData | null;
    isLoading?: boolean;
    recentPurchases?: RecentPurchase[];
    onContact?: (phone: string) => void;
}

const SupplierInfoCard: React.FC<Props> = ({
    supplierName,
    supplierData,
    isLoading = false,
    recentPurchases = [],
    onContact,
}) => {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 size={16} className="animate-spin text-slate-400" />
                <span className="text-xs font-bold text-slate-400 mr-2">جاري تحميل بيانات المورد...</span>
            </div>
        );
    }

    const hasData = supplierData && supplierData.name !== 'غير محدد';

    return (
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-l from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                        <Building2 size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {hasData ? supplierData!.name : supplierName}
                        </h4>
                        {hasData && supplierData!.supplier_code && (
                            <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                                كود: {supplierData!.supplier_code}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Contact Info */}
            {hasData && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {supplierData!.phone && (
                        <div className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                            <Phone size={12} className="text-slate-400 shrink-0" />
                            <span dir="ltr" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex-1">
                                {supplierData!.phone}
                            </span>
                            {onContact && (
                                <button
                                    onClick={() => onContact(supplierData!.phone!)}
                                    className="p-1 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-all active:scale-95"
                                    title="اتصال"
                                >
                                    <ExternalLink size={12} />
                                </button>
                            )}
                        </div>
                    )}
                    {supplierData!.address && (
                        <div className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                            <MapPin size={12} className="text-slate-400 shrink-0" />
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                                {supplierData!.address}
                            </span>
                        </div>
                    )}
                    {supplierData!.email && (
                        <div className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                            <Hash size={12} className="text-slate-400 shrink-0" />
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                                {supplierData!.email}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {!hasData && (
                <div className="px-4 py-6 text-center">
                    <p className="text-[10px] font-bold text-slate-400">لا توجد بيانات إضافية للمورد</p>
                </div>
            )}

            {/* Recent Purchases */}
            {recentPurchases.length > 0 && (
                <div className="border-t border-slate-200 dark:border-slate-800">
                    <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-2">
                        <Package size={11} className="text-emerald-500" />
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                            آخر المشتريات
                        </span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {recentPurchases.slice(0, 3).map((purchase, idx) => (
                            <div key={idx} className="flex items-center justify-between px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                                <div>
                                    <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400">
                                        {new Date(purchase.date).toLocaleDateString('ar-SA')}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 mr-2">
                                        x{purchase.quantity}
                                    </span>
                                </div>
                                <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                    {purchase.total.toLocaleString()} YER
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupplierInfoCard;