import React from 'react';
import { useParties } from '../../parties/hooks';
import { Star } from 'lucide-react';

interface SupplierRatingCardProps {
    companyId: string;
}

export const SupplierRatingCard: React.FC<SupplierRatingCardProps> = () => {
    const { data: suppliers, isLoading } = useParties('supplier');

    if (isLoading) {
        return <div className="p-4 text-gray-500">جاري التحميل...</div>;
    }

    const topSuppliers = suppliers
        ?.sort((a: any, b: any) => (b.total_purchases_amount || 0) - (a.total_purchases_amount || 0))
        .slice(0, 5);

    return (
        <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-4">أفضل الموردين</h3>
            <div className="space-y-3">
                {topSuppliers?.map((supplier, index) => (
                    <div key={supplier.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                            <span className="font-medium">{supplier.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm">{(supplier as any).total_purchases_amount?.toLocaleString() || 0}</span>
                        </div>
                    </div>
                ))}
                {topSuppliers?.length === 0 && (
                    <div className="text-center text-gray-500 py-4">لا يوجد موردون</div>
                )}
            </div>
        </div>
    );
};

export default SupplierRatingCard;
