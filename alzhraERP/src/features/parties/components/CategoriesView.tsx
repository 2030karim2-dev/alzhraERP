
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useCategories, useCategoryMutations } from '../hooks';
import { PartyType } from '../types';
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
    save({ name: data.name, id: editingCategory?.id }, {
      onSuccess: () => setIsModalOpen(false)
    });
  };

  if (isLoading) return <div>جاري تحميل الفئات...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">إدارة الفئات</h3>
        <Button onClick={handleAddNew} leftIcon={<Plus size={16} />}>إضافة فئة</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.isArray(categories) && categories.map((cat) => (
          <CategoryCard
            key={cat.id}
            category={cat}
            onEdit={() => handleEdit(cat)}
            onDelete={() => remove(cat.id)}
          />
        ))}
      </div>

      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        isSaving={isSaving}
        initialData={editingCategory}
      />
    </div>
  );
};

export default CategoriesView;
