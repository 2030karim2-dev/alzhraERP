import React from 'react';
import { cn } from '../../../../core/utils';

interface Props {
    quantity: number;
    minLevel: number;
}

const StockStatusBadge: React.FC<Props> = ({ quantity, minLevel }) => {
    let status = { label: 'متوفر', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    if (quantity <= 0) status = { label: 'نفذت الكمية', color: 'bg-gray-100 text-gray-500 border-gray-200' };
    else if (quantity <= minLevel) status = { label: 'منخفض', color: 'bg-rose-100 text-rose-700 border-rose-200' };

    return (
        <span className={cn("px-2 py-0.5 rounded-lg text-[10px] font-bold border", status.color)}>
            {status.label}
        </span>
    );
};

export default StockStatusBadge;
