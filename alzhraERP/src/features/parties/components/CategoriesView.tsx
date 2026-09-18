import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useCategories, useCategoryMutations } from '../hooks';
import type { PartyType } from '../types';
import Button from '../../../ui/base/Button';
import CategoryCard from './CategoryCard';
import CategoryModal from './CategoryModal';

const CategoriesView: React.FC<{ partyType: PartyType }> = ({ partyType }) => {
  const { data: categories, isLoading } = useCategories(partyType);
  const { save, remove, isSaving } = useCategoryMutations(partyType);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  const handleAddNew = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const handleSave = (data: { name: string }) => {
    save(
      { name: data.name, id: editingCategory?.id },
      {
        onSuccess: () => {
          setIsModalOpen(false);
        },
      }
    );
  };

  const [searchTerm, setSearchTerm] = useState('');

  const filteredCategories = React.useMemo(() => {
    if (!Array.isArray(categories)) return [];
    if (!searchTerm.trim()) return categories;
    const term = searchTerm.toLowerCase();
    return categories.filter(c => c.name.toLowerCase().includes(term));
  }, [categories, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="text-sm font-bold text-slate-400">جاري تحميل الفئات...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {partyType === 'customer' ? 'فئات وتصنيفات العملاء' : 'فئات وتصنيفات الموردين'}
          </h3>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {Array.isArray(categories) ? categories.length : 0} فئات
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="بحث في الفئات..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 outline-none transition-colors hover:border-slate-300 focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          />
          <Button onClick={handleAddNew} size="sm" leftIcon={<Plus size={14} />}>
            إضافة فئة جديدة
          </Button>
        </div>
      </div>

      {filteredCategories.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/40 p-12 text-center text-slate-400 dark:border-slate-800 dark:bg-slate-900/30">
          <p className="text-sm font-bold">لا توجد فئات مطابقة</p>
          <p className="mt-1 text-xs">يمكنك الضغط على زر "إضافة فئة جديدة" لإنشاء تصنيف للجهات.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredCategories.map(cat => (
            <CategoryCard
              key={cat.id}
              category={cat}
              onEdit={() => {
                handleEdit(cat);
              }}
              onDelete={() => {
                if (window.confirm('هل أنت متأكد من حذف هذه الفئة؟')) {
                  remove(cat.id);
                }
              }}
            />
          ))}
        </div>
      )}

      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
        }}
        onSave={handleSave}
        isSaving={isSaving}
        initialData={editingCategory}
      />
    </div>
  );
};

export default CategoriesView;
