// ============================================
// useInventoryManagement — Re-export barrel
// ============================================
// هذا الملف يعمل كـ barrel لضمان التوافق مع الكود القائم.
// يُرجى استيراد hooks مباشرة من ملفاتها المخصصة في الكود الجديد.

// Warehouses
export { useWarehouses, useWarehouseProducts, useWarehouseMutations } from './useWarehouses';

// Stock Audit & Mutations
export {
    useAuditSessions,
    useAuditSession,
    useInventoryMutations,
} from './useStockAudit';

// Analytics & Insights


// Categories (يبقى محلياً — لم يُنقل بعد)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '../service';
import { useAuthStore } from '../../auth/store';
import { useFeedbackStore } from '../../feedback/store';

export const useInventoryCategories = () => {
    const { user } = useAuthStore();
    return useQuery({
        queryKey: ['inventory_categories', user?.company_id],
        queryFn: () => user?.company_id ? inventoryService.getInventoryCategories(user.company_id) : Promise.resolve([] as any[]),
        enabled: !!user?.company_id
    });
};

export const useInventoryCategoryMutations = () => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const { showToast } = useFeedbackStore();

    const create = useMutation({
        mutationFn: (name: string) => {
            if (!user?.company_id) throw new Error("جلسة العمل منتهية");
            return inventoryService.createCategory(user.company_id, name);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory_categories'] });
            showToast("تمت إضافة تصنيف الصنف بنجاح", 'success');
        }
    });

    const remove = useMutation({
        mutationFn: (id: string) => inventoryService.deleteCategory(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory_categories'] });
            showToast("تم حذف التصنيف", 'info');
        }
    });

    return { createCategory: create.mutate, deleteCategory: remove.mutate, isCreating: create.isPending };
};

// Transfers
export const useTransfers = () => {
    const { user } = useAuthStore();
    return useQuery({
        queryKey: ['transfers', user?.company_id],
        queryFn: () => user?.company_id ? inventoryService.getTransfers(user.company_id) : Promise.resolve([] as any[]),
        enabled: !!user?.company_id
    });
};