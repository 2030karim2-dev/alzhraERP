import React from 'react';
import { useCustomers } from '../hooks';

interface CustomerSegmentationProps {
    companyId: string;
}

export const CustomerSegmentation: React.FC<CustomerSegmentationProps> = ({ companyId }) => {
    const { data: customers, isLoading } = useCustomers(companyId);

    if (isLoading) {
        return <div className="p-4 text-gray-500">جاري التحميل...</div>;
    }

    const totalCustomers = customers?.length || 0;
    const activeCustomers = customers?.filter(c => (c.balance || 0) > 0).length || 0;
    const vipCustomers = customers?.filter(c => (c.balance || 0) > 10000).length || 0;

    return (
        <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-4">تقسيم العملاء</h3>
            <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded">
                    <div className="text-2xl font-bold text-blue-600">{totalCustomers}</div>
                    <div className="text-sm text-gray-600">إجمالي العملاء</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded">
                    <div className="text-2xl font-bold text-green-600">{activeCustomers}</div>
                    <div className="text-sm text-gray-600">عملاء نشطون</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded">
                    <div className="text-2xl font-bold text-purple-600">{vipCustomers}</div>
                    <div className="text-sm text-gray-600">عملاء VIP</div>
                </div>
            </div>
        </div>
    );
};

export default CustomerSegmentation;
