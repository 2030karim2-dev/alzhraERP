import React, { useState, useEffect } from 'react';
import { Car, Plus, X, Trash2, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../../auth/store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { inventoryApi } from '../../api';
import { useTranslation } from '../../../../lib/hooks/useTranslation';
import { cn } from '../../../../core/utils';
import SearchInput from '../../../../ui/components/SearchInput';

interface Props {
    productId: string;
}

const FitmentSection: React.FC<Props> = ({ productId }) => {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [isAdding, setIsAdding] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [foundVehicles, setFoundVehicles] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState(false);
    const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

    const { data: fitments, isLoading } = useQuery({
        queryKey: ['product_fitment', productId],
        queryFn: () => inventoryApi.getFitment(productId)
    });

    const addMutation = useMutation({
        mutationFn: inventoryApi.addFitment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['product_fitment', productId] });
            setIsAdding(false);
            setSearchTerm('');
            setFoundVehicles([]);
        }
    });

    const removeMutation = useMutation({
        mutationFn: inventoryApi.removeFitment,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['product_fitment', productId] })
    });

    // Debounced vehicle search
    useEffect(() => {
        if (!isAdding || debouncedSearchTerm.length < 2) {
            setFoundVehicles([]);
            setSearchError(false);
            return;
        }
        setIsSearching(true);
        setSearchError(false);
        inventoryApi.searchVehicles(debouncedSearchTerm)
            .then((res) => setFoundVehicles(res.data || []))
            .catch(() => {
                setFoundVehicles([]);
                setSearchError(true);
            })
            .finally(() => setIsSearching(false));
    }, [debouncedSearchTerm, isAdding]);

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-950">
            {/* Toolbar */}
            <div className="flex justify-between items-center px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex-1">
                    {isAdding && (
                        <SearchInput
                            value={searchTerm}
                            onChange={setSearchTerm}
                            placeholder="بحث سريع..."
                            loading={isSearching}
                            variant="minimal"
                            size="sm"
                            dir="ltr"
                            onEscape={() => {
                                setSearchTerm('');
                                setFoundVehicles([]);
                            }}
                        />
                    )}
                </div>
                <button
                    onClick={() => {
                        setIsAdding(!isAdding);
                        if (isAdding) {
                            setSearchTerm('');
                            setFoundVehicles([]);
                        }
                    }}
                    className={cn(
                        "flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded transition-colors ms-2",
                        isAdding ? "bg-rose-50 text-rose-600 dark:bg-rose-900/20" : "bg-blue-50 text-blue-600 dark:bg-blue-900/20 hover:bg-blue-100"
                    )}
                >
                    {isAdding ? <><X size={12} /> إلغاء</> : <><Plus size={12} /> {t('add')}</>}
                </button>
            </div>

            {/* Results for adding */}
            {isAdding && (
                <div className="max-h-32 overflow-y-auto border-b border-slate-200 dark:border-slate-800 bg-blue-50/30 dark:bg-blue-900/10">
                    {isSearching && (
                        <div className="p-3 text-center">
                            <Loader2 size={14} className="animate-spin inline-block text-blue-500" />
                            <span className="text-[10px] font-bold text-blue-500 mr-2">جاري البحث...</span>
                        </div>
                    )}
                    {!isSearching && foundVehicles.length === 0 && searchTerm.length >= 2 && (
                        <div className="p-3 text-center text-[10px] text-slate-400 font-bold">
                            {searchError ? 'حدث خطأ أثناء البحث' : 'لا توجد سيارات مطابقة'}
                        </div>
                    )}
                    {!isSearching && foundVehicles.map((v: any) => (
                        <button
                            key={v.id}
                            onClick={() => addMutation.mutate({ company_id: user?.company_id || '', product_id: productId, vehicle_id: v.id })}
                            className="w-full text-right px-4 py-2 text-[10px] hover:bg-white dark:hover:bg-slate-900 flex justify-between items-center group border-b border-slate-100 dark:border-slate-800 last:border-0"
                        >
                            <span className="font-bold text-slate-700 dark:text-slate-300">{v.make} {v.model}</span>
                            <span className="text-slate-400 font-mono">{v.year_start}-{v.year_end}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Main Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10">
                        <tr className="border-b border-slate-200 dark:border-slate-800">
                            <th className="text-right px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-tight w-1/2">{t('vehicle')}</th>
                            <th className="text-right px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-tight">{t('years')}</th>
                            <th className="w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                        {isLoading ? (
                            <tr><td colSpan={3} className="text-center py-8 text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('loading')}</td></tr>
                        ) : fitments?.data?.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="text-center py-12 text-slate-300">
                                    <Car size={24} className="mx-auto mb-2 opacity-20" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">{t('no_fitment')}</span>
                                </td>
                            </tr>
                        ) : (
                            fitments?.data?.map((fit: any) => (
                                <tr key={fit.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                    <td className="px-4 py-2 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                        {fit.vehicle.make} {fit.vehicle.model}
                                    </td>
                                    <td className="px-4 py-2 text-[10px] font-bold text-slate-400 font-mono">
                                        {fit.vehicle.year_start} - {fit.vehicle.year_end}
                                    </td>
                                    <td className="px-2 py-2">
                                        <button
                                            onClick={() => removeMutation.mutate(fit.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-all"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FitmentSection;

