import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Car, Plus, X, Loader2 } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { inventoryApi } from '../../api';
import { useTranslation } from '../../../../lib/hooks/useTranslation';
import { useAuthStore } from '../../../auth/store';
import { Vehicle } from '../../types';
import SearchInput from '../../../../ui/components/SearchInput';
import SearchDropdown from '../../../../ui/components/SearchDropdown';

interface Props {
    productId?: string | undefined;
}

const ProductFitment: React.FC<Props> = ({ productId }) => {
    const { } = useTranslation();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Vehicle[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState(false);
    const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // Fetch existing fitment
    const { data: fitments, isLoading } = useQuery({
        queryKey: ['product_fitment', productId],
        queryFn: async () => {
            if (!productId) return { data: [], error: null } as any;
            return await inventoryApi.getFitment(productId);
        },
        enabled: !!productId
    });

    // Debounced search vehicles
    useEffect(() => {
        if (debouncedSearchTerm.length < 2) {
            setSearchResults([]);
            setSearchError(false);
            setDropdownOpen(false);
            return;
        }
        setIsSearching(true);
        setSearchError(false);
        setDropdownOpen(true);
        inventoryApi.searchVehicles(debouncedSearchTerm)
            .then(({ data }) => {
                setSearchResults(data || []);
            })
            .catch(() => {
                setSearchResults([]);
                setSearchError(true);
            })
            .finally(() => setIsSearching(false));
    }, [debouncedSearchTerm]);

    const addMutation = useMutation({
        mutationFn: (vehicleId: string) => inventoryApi.addFitment({
            company_id: user?.company_id || '',
            product_id: productId!,
            vehicle_id: vehicleId
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['product_fitment', productId] });
            setSearchTerm('');
            setSearchResults([]);
            setDropdownOpen(false);
        }
    });

    // Remove fitment
    const removeMutation = useMutation({
        mutationFn: (id: string) => inventoryApi.removeFitment(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['product_fitment', productId] });
        }
    });

    if (!productId) {
        return (
            <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-xl text-center border border-dashed border-gray-300 dark:border-slate-700">
                <Car className="mx-auto text-gray-400 mb-2" />
                <p className="text-xs text-gray-500 font-bold">يرجى حفظ المنتج أولاً لإضافة السيارات المتوافقة</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 px-1">
                <Car size={14} className="text-indigo-500" /> السيارات المتوافقة (Fitment)
            </h4>

            {/* Search & Add */}
            <div className="relative">
                <SearchInput
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="ابحث عن سيارة (مثال: Toyota Camry)..."
                    loading={isSearching}
                    variant="default"
                    size="md"
                    dir="ltr"
                    onEscape={() => setDropdownOpen(false)}
                />

                <SearchDropdown
                    open={dropdownOpen}
                    onClose={() => setDropdownOpen(false)}
                    loading={isSearching}
                    hasResults={searchResults.length > 0}
                    emptyMessage={searchError ? 'حدث خطأ أثناء البحث' : 'لا توجد سيارات مطابقة'}
                    className="z-10 rounded-xl shadow-xl max-h-48 overflow-y-auto"
                >
                    {searchResults.map(vehicle => (
                        <button
                            key={vehicle.id}
                            onClick={() => addMutation.mutate(vehicle.id)}
                            disabled={addMutation.isPending}
                            className="w-full text-right p-2 hover:bg-indigo-50 dark:hover:bg-slate-700 text-xs flex justify-between items-center border-b dark:border-slate-700 last:border-0"
                        >
                            <span className="font-bold text-gray-700 dark:text-gray-200">
                                {vehicle.make} {vehicle.model} ({vehicle.year_start}-{vehicle.year_end})
                            </span>
                            <Plus size={14} className="text-indigo-500" />
                        </button>
                    ))}
                </SearchDropdown>
            </div>

            {/* List of Linked Vehicles */}
            <div className="border border-gray-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden">
                {isLoading ? (
                    <div className="p-4 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500" /></div>
                ) : fitments?.data?.length === 0 ? (
                    <div className="p-4 text-center text-gray-400 text-xs">لا توجد سيارات مضافة</div>
                ) : (
                    <div className="divide-y dark:divide-slate-800">
                        {fitments?.data?.map((fit: any) => (
                            <div key={fit.id} className="p-2 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                        <Car size={12} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-800 dark:text-gray-100">
                                            {fit.vehicle.make} {fit.vehicle.model}
                                        </p>
                                        <p className="text-[10px] text-gray-500">
                                            {fit.vehicle.year_start} - {fit.vehicle.year_end} {fit.vehicle.submodel && `• ${fit.vehicle.submodel}`}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeMutation.mutate(fit.id)}
                                    disabled={removeMutation.isPending}
                                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductFitment;
