// ============================================
// useWarehouses — إدارة المستودعات
// ============================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '../service';
import { useAuthStore } from '../../auth/store';
import { useFeedbackStore } from '../../feedback/store';
import { inventoryApi } from '../api';

/** جلب قائمة المستودعات */
export const useWarehouses = (branchId?: string | null) => {
    const { user } = useAuthStore();
    return useQuery({
        queryKey: ['warehouses', user?.company_id, branchId],
        queryFn: () => user?.company_id ? inventoryService.getWarehouses(user.company_id, branchId) : Promise.resolve([] as any[]),
        enabled: !!user?.company_id,
        staleTime: 5 * 60 * 1000,
    });
};

/** جلب منتجات مستودع محدد */
export const useWarehouseProducts = (warehouseId: string | null) => {
    const { user } = useAuthStore();
    return useQuery({
        queryKey: ['warehouse_products', warehouseId],
        queryFn: () => (user?.company_id && warehouseId)
            ? inventoryService.getProductsForWarehouse(user.company_id, warehouseId)
            : Promise.resolve([] as any[]),
        enabled: !!user?.company_id && !!warehouseId,
        staleTime: 5 * 60 * 1000,
    });
};

/** mutations الخاصة بإنشاء/تعديل/حذف المستودعات */
export const useWarehouseMutations = () => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const { showToast } = useFeedbackStore();

    const save = useMutation({
        mutationFn: async (data: { id?: string, name_ar: string, location: string, branch_id?: string | null }) => {
            if (!user?.company_id) throw new Error("Auth error");
            return await inventoryApi.saveWarehouse(user.company_id, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['warehouses'] });
            showToast("تم حفظ بيانات المستودع بنجاح", 'success');
        }
    });

    const remove = useMutation({
        mutationFn: async ({ id }: { id: string }) => {
            return await inventoryApi.deleteWarehouse(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['warehouses'] });
            showToast("تم حذف المستودع", 'info');
        },
        onError: (err: Error) => showToast(err.message, 'error')
    });

    return {
        saveWarehouse: save.mutate,
        deleteWarehouse: remove.mutate,
        isSaving: save.isPending
    };
};
