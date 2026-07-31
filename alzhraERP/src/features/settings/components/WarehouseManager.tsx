import React, { useState } from 'react';
import { Package, Plus, Trash2, CheckCircle, MapPin, Loader2 } from 'lucide-react';
import { useWarehouses, useWarehouseMutations } from '../hooks';

const WarehouseManager: React.FC = () => {
  const { data: warehouses, isLoading } = useWarehouses();
  const { addWarehouse, deleteWarehouse, setPrimary, isAdding } = useWarehouseMutations();

  const [newWarehouse, setNewWarehouse] = useState({ name_ar: '', location: '' });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWarehouse.name_ar) return;

    addWarehouse({ ...newWarehouse }, {
      onSuccess: () => setNewWarehouse({ name_ar: '', location: '' })
    });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المستودع؟')) {
      deleteWarehouse(id);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">جاري تحميل المستودعات...</div>;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-3">
      <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
            <Package size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">المستودعات والفروع</h3>
            <p className="text-xs text-gray-500">إدارة أماكن تخزين المنتجات</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Add Form */}
        <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-3 mb-8 bg-gray-50 p-4 rounded-xl border border-gray-100">
          <input
            type="text"
            placeholder="اسم المستودع (مثال: الفرع الرئيسي)"
            value={newWarehouse.name_ar}
            onChange={(e) => setNewWarehouse({ ...newWarehouse, name_ar: e.target.value })}
            className="flex-1 p-2.5 border border-gray-200 rounded-lg focus:border-amber-500 outline-none"
            required
          />
          <input
            type="text"
            placeholder="الموقع / العنوان"
            value={newWarehouse.location}
            onChange={(e) => setNewWarehouse({ ...newWarehouse, location: e.target.value })}
            className="flex-1 p-2.5 border border-gray-200 rounded-lg focus:border-amber-500 outline-none"
          />
          <button
            type="submit"
            disabled={isAdding}
            className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {isAdding ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
            إضافة
          </button>
        </form>

        {/* List */}
        <div className="grid gap-3">
          {warehouses?.map((wh: any) => (
            <div key={wh.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-amber-200 transition-colors">
              <div className="flex items-center gap-3">
                <MapPin size={18} className="text-gray-400" />
                <div>
                  <p className="font-bold text-gray-800">{wh.name_ar || wh.name}</p>
                  {wh.location && <p className="text-xs text-gray-500">{wh.location}</p>}
                </div>
                {wh.is_primary && (
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle size={12} /> أساسي
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!wh.is_primary && (
                  <button
                    onClick={() => setPrimary(wh.id)}
                    className="text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    تعيين كأساسي
                  </button>
                )}
                <button
                  onClick={() => handleDelete(wh.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WarehouseManager;