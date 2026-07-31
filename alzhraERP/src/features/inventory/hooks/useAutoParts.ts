import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '../api';
import { useAuthStore } from '@/features/auth/store';
import { useFeedbackStore } from '@/features/feedback/store';

// --- Cross References Hooks ---
export const useCrossReferences = (productId: string | null) => {
    return useQuery({
        queryKey: ['cross_references', productId],
        queryFn: () => productId ? inventoryApi.getCrossReferences(productId) : Promise.resolve([]),
        enabled: !!productId
    });
};

export const useCrossReferenceMutations = (productId: string) => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const { showToast } = useFeedbackStore();

    const add = useMutation({
        mutationFn: (data: { alternative_product_id: string; match_quality: string; notes?: string }) => {
            if (!user?.company_id) throw new Error("Auth error");
            return inventoryApi.addCrossReference({
                ...data,
                base_product_id: productId,
                company_id: user.company_id
            } as any);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cross_references', productId] });
            showToast("تمت إضافة الرقم البديل للمنتج بنجاح", 'success');
        },
        onError: (e: any) => showToast(e.message || "حدث خطأ أثناء الإضافة", 'error')
    });

    const remove = useMutation({
        mutationFn: inventoryApi.deleteCrossReference,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cross_references', productId] });
            showToast("تم حذف الرقم البديل", 'info');
        }
    });

    return { addCrossReference: add.mutateAsync, removeCrossReference: remove.mutateAsync, isAdding: add.isPending };
};

// --- Kit Components Hooks ---
export const useKitComponents = (kitId: string | null) => {
    return useQuery({
        queryKey: ['kit_components', kitId],
        queryFn: () => kitId ? inventoryApi.getKitComponents(kitId) : Promise.resolve([]),
        enabled: !!kitId
    });
};

export const useKitMutations = (kitId: string) => {
    const queryClient = useQueryClient();
    const { showToast } = useFeedbackStore();

    const add = useMutation({
        mutationFn: (data: { component_product_id: string; quantity: number }) =>
            inventoryApi.addKitComponent({ ...data, kit_product_id: kitId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kit_components', kitId] });
            showToast("تمت إضافة المكون إلى الباقة", 'success');
        },
        onError: (e: any) => showToast(e.message || "حدث خطأ أثناء الربط", 'error')
    });

    const remove = useMutation({
        mutationFn: inventoryApi.removeKitComponent,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kit_components', kitId] });
            showToast("تم الحذف من الباقة", 'info');
        }
    });

    return { addKitComponent: add.mutateAsync, removeKitComponent: remove.mutateAsync, isAdding: add.isPending };
};

// --- Supplier Prices (Sourcing) Hooks ---
export const useSupplierPrices = (productId: string | null) => {
    const { user } = useAuthStore();
    return useQuery({
        queryKey: ['supplier_prices', productId],
        queryFn: () => productId ? inventoryApi.getSupplierPrices(productId) : Promise.resolve([]),
        enabled: !!productId && !!user?.company_id
    });
};

export const useSupplierPriceMutations = (productId: string) => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const { showToast } = useFeedbackStore();

    const add = useMutation({
        mutationFn: (data: { supplier_id: string; cost_price: number; lead_time_days?: number; supplier_part_number?: string; notes?: string }) => {
            if (!user?.company_id) throw new Error("Auth error");
            return inventoryApi.addSupplierPrice({
                ...data,
                product_id: productId,
                company_id: user.company_id
            } as any);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['supplier_prices', productId] });
            showToast("تم حفظ تسعيرة المورد بنجاح", 'success');
        },
        onError: (e: any) => showToast(e.message || "فشل حفظ التسعيرة", 'error')
    });

    return { addSupplierPrice: add.mutateAsync, isAdding: add.isPending };
};
