import React, { useState } from 'react';
import { Car, Plus, Hash } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '../inventory/api';
import { Vehicle } from '../inventory/types';
import MicroHeader from '../../ui/base/MicroHeader';
import { useTranslation } from '../../lib/hooks/useTranslation';
import FullscreenContainer from '../../ui/base/FullscreenContainer';
import { cn } from '../../core/utils';

// Decomposed components
import VehicleModal from './components/VehicleModal';
import VehicleCard from './components/VehicleCard';
import CompatibleProductsList from './components/CompatibleProductsList';
import VINLookupTab from './components/VINLookupTab';

type ViewTab = 'list' | 'vin';

const VehiclesPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ViewTab>('list');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [isZenMode, setIsZenMode] = useState(false);
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    const { data: vehicles, isLoading } = useQuery({
        queryKey: ['vehicles', searchTerm],
        queryFn: () => inventoryApi.getVehicles(searchTerm ? { make: searchTerm } : undefined)
    });

    const upsertMutation = useMutation({
        mutationFn: (v: Partial<Vehicle>) => inventoryApi.upsertVehicle(v),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vehicles'] });
            setIsModalOpen(false);
            setEditVehicle(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => inventoryApi.deleteVehicle(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vehicles'] });
            if (selectedVehicle?.id === editVehicle?.id) setSelectedVehicle(null);
        }
    });

    const TABS = [
        { id: 'list' as const, label: t('common_vehicles'), icon: Car },
        { id: 'vin' as const, label: t('vin_decoder'), icon: Hash },
    ];

    const headerActions = (
        <button
            onClick={() => { setEditVehicle(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-xl active:scale-95 shadow-lg shadow-indigo-500/20 text-[10px] font-bold uppercase tracking-widest"
        >
            <Plus size={14} /> {t('add_vehicle')}
        </button>
    );

    const vehicleList = (vehicles?.data as Vehicle[]) || [];
    const filteredVehicles = vehicleList.filter((v: Vehicle) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return v.make.toLowerCase().includes(term) || v.model.toLowerCase().includes(term);
    });

    return (
        <FullscreenContainer isMaximized={isMaximized} onToggleMaximize={() => { setIsMaximized(false); setIsZenMode(false); }} isZenMode={isZenMode}>
            <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-950 font-cairo">
                <MicroHeader
                    title={t('vehicle_management')}
                    icon={Car}
                    iconColor="text-indigo-600"
                    actions={headerActions}
                    tabs={TABS}
                    activeTab={activeTab}
                    onTabChange={(id) => setActiveTab(id as ViewTab)}
                    searchPlaceholder={t('search_vehicles')}
                    searchValue={searchTerm}
                    onSearchChange={setSearchTerm}
                    isMaximized={isMaximized}
                    onToggleMaximize={() => {
                        setIsMaximized(!isMaximized);
                        if (isMaximized) setIsZenMode(false);
                    }}
                    isZenMode={isZenMode}
                    onToggleZen={() => setIsZenMode(!isZenMode)}
                />

                <div className={cn(
                    "flex-1 overflow-hidden flex flex-col relative z-20",
                    isZenMode ? "bg-white dark:bg-slate-900" : ""
                )}>
                    <div className="flex-1 overflow-y-auto px-2 md:px-4 pt-5 md:pt-6 pb-24 custom-scrollbar">
                        {activeTab === 'list' ? (
                            <>
                                {isLoading ? (
                                    <div className="text-center py-20 text-gray-400 text-sm">{t('loading')}</div>
                                ) : filteredVehicles.length === 0 ? (
                                    <div className="text-center py-20 text-gray-400">
                                        <Car size={48} className="mx-auto mb-4 opacity-30" />
                                        <p className="text-lg font-bold">{t('no_data_available')}</p>
                                        <p className="text-sm mt-2">{t('add_new_entity', { entity: t('common_vehicles') })}</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {filteredVehicles.map((v: Vehicle) => (
                                            <VehicleCard
                                                key={v.id}
                                                vehicle={v}
                                                isSelected={selectedVehicle?.id === v.id}
                                                onSelect={() => setSelectedVehicle(selectedVehicle?.id === v.id ? null : v)}
                                                onEdit={() => { setEditVehicle(v); setIsModalOpen(true); }}
                                                onDelete={() => deleteMutation.mutate(v.id)}
                                            />
                                        ))}
                                    </div>
                                )}

                                {selectedVehicle && (
                                    <div className="mt-4">
                                        <CompatibleProductsList
                                            vehicleId={selectedVehicle.id}
                                            vehicleName={`${selectedVehicle.make} ${selectedVehicle.model}`}
                                        />
                                    </div>
                                )}
                            </>
                        ) : (
                            <VINLookupTab />
                        )}
                    </div>
                </div>

                {isModalOpen && (
                    <VehicleModal
                        vehicle={editVehicle}
                        onClose={() => { setIsModalOpen(false); setEditVehicle(null); }}
                        onSave={(v) => upsertMutation.mutate(editVehicle ? { ...v, id: editVehicle.id } : v)}
                    />
                )}
            </div>
        </FullscreenContainer>
    );
};

export default VehiclesPage;
