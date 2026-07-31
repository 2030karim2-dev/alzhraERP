import React, { useState } from 'react';
import { Package, Plus, Trash2,  Edit } from 'lucide-react';
// Fix: Corrected the import for useWarehouses and useWarehouseMutations hooks.
import { useWarehouses, useWarehouseMutations } from '../../hooks/useWarehouseHooks';
import MicroListItem from '../../../../ui/common/MicroListItem';
import Button from '../../../../ui/base/Button';
import WarehouseModal from './WarehouseModal';

const WarehouseManager: React.FC = () => {
  const { data: warehouses, isLoading } = useWarehouses();
  const { save, remove, isSaving } = useWarehouseMutations();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);

  const handleEdit = (wh: any) => {
    setEditingWarehouse(wh);
    setModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingWarehouse(null);
    setModalOpen(true);
  };

  const handleSave = (data: any) => {
    save(data, { onSuccess: () => setModalOpen(false) });
  };

  const handleDelete = (id: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذا المستودع؟")) {
      remove({ id });
    }
  };

  if (isLoading) return <div className="p-10 text-center animate-pulse">جاري تحميل...</div>;

  return (
    <div className="p-3 md:p-4 animate-in fade-in max-w-none mx-auto">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">المستودعات والفروع</h2>
          <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">إدارة أماكن تخزين البضاعة</p>
        </div>
        <Button onClick={handleAddNew} className="rounded-xl px-6" leftIcon={<Plus size={16} />}>إضافة فرع</Button>
      </div>

      <div className="space-y-2">
        {warehouses?.map((wh: any) => (
          <MicroListItem
            key={wh.id}
            icon={Package}
            iconColorClass="text-blue-500"
            title={wh.name_ar || wh.name}
            subtitle={wh.location || "بدون عنوان"}
            tags={[]}
            onClick={() => handleEdit(wh)}
            actions={
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); handleEdit(wh); }} className="p-1.5 text-gray-400 hover:text-blue-500 dark:hover:bg-blue-950/20 rounded-lg" title="تعديل">
                  <Edit size={14} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(wh.id); }} className="p-1.5 text-gray-400 hover:text-rose-500 dark:hover:bg-rose-950/20 rounded-lg" title="حذف">
                  <Trash2 size={14} />
                </button>
              </div>
            }
          />
        ))}
      </div>

      <WarehouseModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        isSaving={isSaving}
        initialData={editingWarehouse}
      />
    </div>
  );
};
export default WarehouseManager;
