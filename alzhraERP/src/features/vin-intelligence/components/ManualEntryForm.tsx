import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, X, Plus, Wrench, Car } from 'lucide-react';

interface ManualEntryFormProps {
  type: 'vehicle' | 'part';
  onSave: (data: any) => void;
  onCancel: () => void;
}

const ManualEntryForm: React.FC<ManualEntryFormProps> = ({ type, onSave, onCancel }) => {
  const [formData, setFormData] = useState<any>(
    type === 'vehicle' 
      ? { make: '', model: '', year: new Date().getFullYear(), engineSize: '', transmission: '' }
      : { canonicalPartName: '', category: 'Filters', oemNumbers: [''], side: 'NONE' }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, isManualEntry: true });
  };

  const handleOemChange = (index: number, value: string) => {
    const newOems = [...formData.oemNumbers];
    newOems[index] = value;
    setFormData({ ...formData, oemNumbers: newOems });
  };

  const addOemField = () => {
    setFormData({ ...formData, oemNumbers: [...formData.oemNumbers, ''] });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-[var(--app-surface)] border-2 border-blue-500/30 rounded-none p-4 shadow-2xl relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {type === 'vehicle' ? <Car size={16} className="text-blue-600" /> : <Wrench size={16} className="text-blue-600" />}
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text)]">
            {type === 'vehicle' ? 'إدخال بيانات المركبة يدوياً' : 'إضافة قطعة غيار يدوياً'}
          </h3>
        </div>
        <button onClick={onCancel} className="text-[var(--app-text-secondary)] hover:text-rose-500 transition-colors">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {type === 'vehicle' ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-[var(--app-text-secondary)] uppercase">الشركة المصنعة</label>
              <input 
                required
                value={formData.make}
                onChange={e => setFormData({...formData, make: e.target.value})}
                className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] rounded-none px-2 py-1.5 text-[10px] font-bold focus:border-blue-500 outline-none"
                placeholder="مثال: Toyota"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-[var(--app-text-secondary)] uppercase">الموديل</label>
              <input 
                required
                value={formData.model}
                onChange={e => setFormData({...formData, model: e.target.value})}
                className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] rounded-none px-2 py-1.5 text-[10px] font-bold focus:border-blue-500 outline-none"
                placeholder="مثال: Camry"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-[var(--app-text-secondary)] uppercase">السنة</label>
              <input 
                type="number"
                value={formData.year}
                onChange={e => setFormData({...formData, year: parseInt(e.target.value)})}
                className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] rounded-none px-2 py-1.5 text-[10px] font-bold focus:border-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-[var(--app-text-secondary)] uppercase">حجم المحرك</label>
              <input 
                value={formData.engineSize}
                onChange={e => setFormData({...formData, engineSize: e.target.value})}
                className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] rounded-none px-2 py-1.5 text-[10px] font-bold focus:border-blue-500 outline-none"
                placeholder="مثال: 2.5L"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-[var(--app-text-secondary)] uppercase">اسم القطعة</label>
              <input 
                required
                value={formData.canonicalPartName}
                onChange={e => setFormData({...formData, canonicalPartName: e.target.value})}
                className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] rounded-none px-2 py-1.5 text-[10px] font-bold focus:border-blue-500 outline-none"
                placeholder="مثال: فلتر زيت"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-[var(--app-text-secondary)] uppercase">أرقام OEM</label>
              {formData.oemNumbers.map((num: string, i: number) => (
                <input 
                  key={i}
                  value={num}
                  onChange={e => handleOemChange(i, e.target.value)}
                  className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] rounded-none px-2 py-1.5 text-[10px] font-mono font-bold focus:border-blue-500 outline-none mb-1"
                  placeholder="رقم القطعة الأصلي"
                />
              ))}
              <button 
                type="button"
                onClick={addOemField}
                className="text-[8px] font-black text-blue-600 flex items-center gap-1 mt-1 hover:underline"
              >
                <Plus size={10} /> إضافة رقم آخر
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button 
            type="submit"
            className="flex-1 bg-blue-600 text-white py-2 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-500/20"
          >
            <Save size={14} /> حفظ البيانات
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default ManualEntryForm;
