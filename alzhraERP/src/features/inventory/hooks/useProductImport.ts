import { useProductMutations } from './useProducts';
import { useCurrencies } from '../../settings/hooks';
import { useFeedbackStore } from '../../feedback/store';
import { Product } from '../types';

export const useProductImport = (products: Product[]) => {
    const { saveProduct } = useProductMutations();
    const { rates } = useCurrencies();
    const { showToast } = useFeedbackStore();

    const handleSmartImportConfirm = async (data: { items: any[], currency?: string }) => {
        const { items, currency } = data;
        try {
            let successCount = 0;
            const rate = currency ? ((rates.data as any)?.[currency] || 1) : 1;

            for (const item of items) {
                const isDuplicate = products.some(p => p.name.trim().toLowerCase() === item.name.trim().toLowerCase());
                if (isDuplicate) {
                    console.warn(`Skipping duplicate product: ${item.name}`);
                    continue;
                }

                const rawCost = Number(item.cost_price || item.unitPrice) || 0;
                const convertedCost = rawCost * rate;

                await saveProduct({
                    data: {
                        name: item.name,
                        part_number: item.partNumber || item.part_number || '',
                        brand: item.brand || '',
                        stock_quantity: Number(item.stock_quantity || item.quantity) || 0,
                        cost_price: convertedCost,
                        selling_price: convertedCost * 1.3,
                        category: 'عام',
                        unit: 'piece',
                        min_stock_level: 5,
                        sku: `AZ-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
                    }
                });
                successCount++;
            }
            showToast(`تم استيراد ${successCount} صنف بنجاح إلى المخزن${rate !== 1 ? ` بسعر صرف ${rate}` : ''}`, 'success');
            return true;
        } catch (e) {
            showToast('حدث خطأ أثناء حفظ بعض الأصناف المستوردة', 'error');
            return false;
        }
    };

    return { handleSmartImportConfirm };
};
