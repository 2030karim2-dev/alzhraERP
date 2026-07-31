import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '../../inventory/api';
import { useAuthStore } from '../../auth/store';
import { useFeedbackStore } from '../../feedback/store';
import { PartEntry } from '../types';
import { decodeVinBasic } from '../constants';

export const useVINLookup = () => {
    const [vinInput, setVinInput] = useState('');
    const [decodedVehicle, setDecodedVehicle] = useState<any>(null);
    const [savedVehicleId, setSavedVehicleId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [parts, setParts] = useState<PartEntry[]>([]);
    const [showPartForm, setShowPartForm] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [linkingPartId, setLinkingPartId] = useState<string | null>(null);
    const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});

    const { user } = useAuthStore();
    const { showToast } = useFeedbackStore();
    const companyId = user?.company_id;
    const queryClient = useQueryClient();

    // ============ بحث المنتجات لربط القطع ============
    const { data: searchResults } = useQuery({
        queryKey: ['product-search-vin', productSearch],
        queryFn: async () => {
            if (!productSearch || productSearch.length < 2 || !companyId) return [];
            return await inventoryApi.searchProductForFitment(companyId, productSearch);
        },
        enabled: !!productSearch && productSearch.length >= 2,
    });

    // ============ حفظ المركبة تلقائياً ============
    const saveVehicleMutation = useMutation({
        mutationFn: async (decoded: any) => {
            const vehicleData = {
                make: decoded.make,
                model: 'غير محدد',
                year_start: decoded.year,
                year_end: decoded.year,
                vin_prefix: decoded.raw.substring(0, 10),
                region: decoded.country === 'أمريكا' ? 'US' : decoded.country === 'اليابان' ? 'JP' : decoded.country === 'كوريا' ? 'KR' : decoded.country === 'ألمانيا' ? 'EU' : 'GCC',
            };
            const result = await inventoryApi.upsertVehicle(vehicleData);
            return result;
        },
        onSuccess: (result) => {
            if (result?.data?.id) {
                setSavedVehicleId(result.data.id);
                queryClient.invalidateQueries({ queryKey: ['vehicles'] });
            }
        }
    });

    // ============ حفظ قطعة جديدة في المخزون ============
    const savePartAsProduct = useCallback(async (part: PartEntry) => {
        if (!companyId || !user?.id) return;
        setSavingStates(prev => ({ ...prev, [part.id]: true }));

        try {
            if (part.action === 'new') {
                const productData: import('../../../core/types/supabase-helpers').TableInsert<'products'> = {
                    company_id: companyId,
                    name_ar: part.nameAr || part.nameEn,
                    sku: part.partNumber,
                    part_number: part.partNumber,
                    brand: part.brand,
                    cost_price: 0,
                    sale_price: 0,
                    min_stock_level: 0,
                    unit: 'قطعة'
                };
                const { data: newProduct, error } = await inventoryApi.createProduct(productData);
                if (error) throw error;

                if (savedVehicleId && newProduct?.id) {
                    await inventoryApi.addFitment({ company_id: companyId, product_id: newProduct.id, vehicle_id: savedVehicleId });
                }

                setParts(prev => prev.map(p => p.id === part.id ? { ...p, linkedProductId: newProduct?.id, linkedProductName: part.nameAr } : p));
            } else if (part.action === 'cross_ref' && part.linkedProductId) {
                const newProductData: import('../../../core/types/supabase-helpers').TableInsert<'products'> = {
                    company_id: companyId,
                    name_ar: part.nameAr || part.nameEn,
                    sku: part.partNumber,
                    part_number: part.partNumber,
                    brand: part.brand,
                    cost_price: 0,
                    sale_price: 0,
                    min_stock_level: 0,
                    unit: 'قطعة'
                };
                const { data: altProduct, error: altErr } = await inventoryApi.createProduct(newProductData);
                if (altErr) throw altErr;

                await inventoryApi.addCrossReference({
                    company_id: companyId,
                    base_product_id: part.linkedProductId,
                    alternative_product_id: altProduct.id,
                    match_quality: 'interchangeable',
                    notes: `تمت إضافتها من ${part.source} - VIN: ${vinInput}`
                });

                if (savedVehicleId && altProduct?.id) {
                    await inventoryApi.addFitment({ company_id: companyId, product_id: altProduct.id, vehicle_id: savedVehicleId });
                }
            } else if (part.action === 'fitment' && part.linkedProductId && savedVehicleId) {
                await inventoryApi.addFitment({ company_id: companyId, product_id: part.linkedProductId, vehicle_id: savedVehicleId });
            }

            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['vehicles'] });

            setParts(prev => prev.filter(p => p.id !== part.id));
        } catch (err: unknown) {
            const e = err as Error;
            console.error('Error saving part:', err);
            showToast('خطأ في الحفظ: ' + (e?.message || 'غير معروف'), 'error');
        } finally {
            setSavingStates(prev => ({ ...prev, [part.id]: false }));
        }
    }, [companyId, user, savedVehicleId, vinInput, queryClient]);

    // ============ البحث ============
    const handleVinSearch = useCallback(() => {
        const decoded = decodeVinBasic(vinInput);
        setDecodedVehicle(decoded);
        if (decoded) {
            saveVehicleMutation.mutate(decoded);
        }
    }, [vinInput, saveVehicleMutation]);

    const handleCopyVin = useCallback(() => {
        navigator.clipboard.writeText(vinInput);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [vinInput]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && vinInput.length >= 17) handleVinSearch();
    }, [vinInput, handleVinSearch]);

    // ============ إضافة قطعة جديدة ============
    const addPart = useCallback((data: Omit<PartEntry, 'id'>) => {
        setParts(prev => [...prev, { ...data, id: Date.now().toString() }]);
        setShowPartForm(false);
    }, []);

    const removePart = useCallback((id: string) => {
        setParts(prev => prev.filter(p => p.id !== id));
    }, []);

    const isValidLength = vinInput.length === 17;

    return {
        state: { vinInput, decodedVehicle, savedVehicleId, copied, parts, showPartForm, productSearch, linkingPartId, savingStates, isValidLength, searchResults },
        actions: { setVinInput, setDecodedVehicle, setSavedVehicleId, setShowPartForm, setProductSearch, setLinkingPartId, setParts, handleVinSearch, handleCopyVin, handleKeyDown, addPart, removePart, savePartAsProduct },
        queries: { isVehicleSaving: saveVehicleMutation.isPending }
    };
};
