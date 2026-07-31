import { useState } from 'react';
import { Product } from '../types';
import { formatCurrency } from '../../../core/utils';
import { useFeedbackStore } from '../../../features/feedback/store';

export const useProductBulkActions = (products: Product[]) => {
    const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
    const { showToast } = useFeedbackStore();

    const generateShareText = () => {
        const selectedProducts = products.filter(p => selectedRowIds.has(p.id));
        if (selectedProducts.length === 0) return '';

        let text = 'قائمة الأصناف المحددة:\n\n';
        selectedProducts.forEach(p => {
            text += `- ${p.name} `;
            if (p.part_number) text += `(رقم القطعة: ${p.part_number}) `;
            text += `| السعر: ${formatCurrency(p.sale_price ?? p.selling_price ?? 0)} ريال\n`;
        });
        return text;
    };

    const handleCopy = async () => {
        if (selectedRowIds.size === 0) return;
        const text = generateShareText();
        try {
            await navigator.clipboard.writeText(text);
            showToast('تم نسخ البيانات للحافظة', 'success');
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    const handleSend = () => {
        if (selectedRowIds.size === 0) return;
        const text = encodeURIComponent(generateShareText());
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    const clearSelection = () => setSelectedRowIds(new Set());

    return {
        selectedRowIds,
        setSelectedRowIds,
        handleCopy,
        handleSend,
        clearSelection,
        hasSelection: selectedRowIds.size > 0
    };
};
