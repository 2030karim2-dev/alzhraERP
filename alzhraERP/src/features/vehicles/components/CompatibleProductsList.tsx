import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../../inventory/api';
import { formatNumberDisplay } from '../../../core/utils';
import { Package } from 'lucide-react';
import { cn } from '../../../core/utils';

interface Props {
    vehicleId: string;
    vehicleName: string;
}

const CompatibleProductsList: React.FC<Props> = ({ vehicleId, vehicleName }) => {
    const { data: products, isLoading } = useQuery({
        queryKey: ['vehicle_products', vehicleId],
        queryFn: () => inventoryApi.getVehicleProducts(vehicleId),
        enabled: !!vehicleId
    });

    if (!vehicleId) return null;

    return (
        <div className="bg-white dark:bg-slate-900 border-t dark:border-slate-800 p-6 animate-in slide-in-from-bottom-10 duration-500">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Package className="text-indigo-600" />
                قطع الغيار المتوافقة مع: <span className="text-indigo-600">{vehicleName}</span>
            </h3>

            {isLoading ? (
                <div className="text-center py-8 text-gray-400">جاري البحث عن القطع...</div>
            ) : (products?.data as any[])?.length === 0 ? (
                <div className="text-center py-8 text-gray-400 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed dark:border-slate-700">
                    لا توجد قطع غيار مرتبطة بهذه المركبة حالياً
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(products?.data as any[])?.map((p: any) => (
                        <div key={p.fitment_id} className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border dark:border-slate-700 hover:border-indigo-500 transition-colors group relative">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white">{p.name}</h4>
                                    <p className="text-xs font-mono text-gray-500 mt-1">{p.part_number || p.sku}</p>
                                </div>
                                <span className={cn(
                                    "px-2 py-1 rounded-lg text-[10px] font-bold",
                                    p.total_stock > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                                )}>
                                    {p.total_stock > 0 ? `${formatNumberDisplay(p.total_stock)} متوفر` : 'نفذت الكمية'}
                                </span>
                            </div>
                            <div className="mt-3 flex justify-between items-end">
                                <div className="text-lg font-bold text-indigo-600 font-mono">
                                    {p.price ? formatNumberDisplay(p.price) : '-'} <span className="text-[10px]">SAR</span>
                                </div>
                                {p.notes && (
                                    <div className="text-[10px] bg-yellow-50 text-yellow-700 px-2 py-1 rounded border border-yellow-100 max-w-[60%] truncate" title={p.notes}>
                                        {p.notes}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CompatibleProductsList;
