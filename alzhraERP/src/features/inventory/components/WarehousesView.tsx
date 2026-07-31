import React, { useState } from 'react';
import { useWarehouses, useWarehouseMutations } from '../hooks/useInventoryManagement';
import WarehouseDetailView from './warehouses/WarehouseDetailView';
import WarehouseModal from './WarehouseModal';
import { Loader2 } from 'lucide-react';
import Button from '../../../ui/base/Button';
import FullscreenContainer from '../../../ui/base/FullscreenContainer';
import { cn } from '../../../core/utils';
import WarehouseListHeader from './warehouses/WarehouseListHeader';
import WarehouseTable from './warehouses/WarehouseTable';

const WarehousesView: React.FC = () => {
    const { data: warehouses, isLoading } = useWarehouses();
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState<any | null>(null);
    const { saveWarehouse, deleteWarehouse, isSaving } = useWarehouseMutations();
    const [isMaximized, setIsMaximized] = useState(false);

    const handleSave = (data: any) => {
        const payload = editingWarehouse ? { ...data, id: editingWarehouse.id } : data;
        saveWarehouse(payload, { onSuccess: () => { setIsModalOpen(false); } });
    };

    const handleEdit = (wh: any) => {
        setEditingWarehouse(wh);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm("هل أنت متأكد من حذف هذا المستودع؟")) {
            deleteWarehouse({ id }, {
                onSuccess: () => {
                    if (selectedWarehouseId === id) {
                        setSelectedWarehouseId(null);
                        setViewMode('list');
                    }
                }
            });
        }
    };

    const handleViewDetails = (id: string) => {
        setSelectedWarehouseId(id);
        setViewMode('detail');
    };

    if (isLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin text-blue-500 mx-auto mb-4" size={32} /></div>;

    return (
        <FullscreenContainer isMaximized={isMaximized} onToggleMaximize={() => { setIsMaximized(false); }}>
            <div className={cn(
                "animate-in fade-in duration-500 h-full flex flex-col",
                isMaximized && "bg-[var(--app-bg)] p-4 md:p-8"
            )}>

                {viewMode === 'list' ? (
                    <div className="space-y-2 h-full flex flex-col">
                        <WarehouseListHeader 
                            isMaximized={isMaximized}
                            onMaximize={() => setIsMaximized(true)}
                            onAddWarehouse={() => { setEditingWarehouse(null); setIsModalOpen(true); }}
                        />

                        <WarehouseTable 
                            warehouses={warehouses || []}
                            onViewDetails={handleViewDetails}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
                    </div>
                ) : (
                    <div className="h-full flex flex-col space-y-3">
                        <div className="flex items-center gap-4">
                            <Button
                                onClick={() => { setViewMode('list'); }}
                                variant="outline"
                                className="h-10 px-6 rounded-xl font-bold text-sm"
                            >
                                الرجوع للقائمة
                            </Button>
                        </div>
                        <div className="flex-1">
                            <WarehouseDetailView
                                warehouseId={selectedWarehouseId}
                                warehouses={warehouses || []}
                            />
                        </div>
                    </div>
                )}

                <WarehouseModal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); }}
                    onSave={handleSave}
                    isSaving={isSaving}
                    initialData={editingWarehouse}
                />
            </div>
        </FullscreenContainer>
    );
};

export default WarehousesView;
