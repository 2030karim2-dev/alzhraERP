import React, { useState } from 'react';
import { Search, Filter, SlidersHorizontal, Car, Hash, Building2 } from 'lucide-react';
import Button from '../../../ui/base/Button';
import Input from '../../../ui/base/Input';
import { cn } from '../../../core/utils';

interface AdvancedPartSearchPageProps {
  onSearch: (filters: PartSearchFilters) => void;
  className?: string;
}

export interface PartSearchFilters {
  partNumber: string;
  oemNumber: string;
  brand: string;
  make: string;
  model: string;
  yearFrom: string;
  yearTo: string;
  category: string;
}

const AdvancedPartSearchPage: React.FC<AdvancedPartSearchPageProps> = ({ onSearch, className }) => {
  const [filters, setFilters] = useState<PartSearchFilters>({
    partNumber: '', oemNumber: '', brand: '', make: '', model: '', yearFrom: '', yearTo: '', category: '',
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const update = (field: keyof PartSearchFilters, value: string): void => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    onSearch(filters);
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      {/* Primary Search Row */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="رقم القطعة أو OEM..."
            value={filters.partNumber}
            onChange={e => update('partNumber', e.target.value)}
            icon={<Hash size={14} />}
          />
        </div>
        <Button type="submit" variant="primary" size="md" leftIcon={<Search size={14} />}>
          بحث
        </Button>
        <Button
          type="button" variant={showAdvanced ? 'primary' : 'ghost'} size="md"
          onClick={() => setShowAdvanced(!showAdvanced)}
          leftIcon={<SlidersHorizontal size={14} />}
        >
          <span className="hidden sm:inline">متقدم</span>
        </Button>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="p-4 rounded-2xl bg-[var(--app-bg)] border border-[var(--app-border)] animate-in slide-in-from-top-2 duration-300 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Filter size={14} className="text-[var(--accent)]" />
            <span className="text-xs font-bold text-[var(--app-text)]">تصفية متقدمة</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Input
              label="رقم OEM" placeholder="مثلاً: 04465-0K240"
              value={filters.oemNumber} onChange={e => update('oemNumber', e.target.value)}
              icon={<Hash size={14} />} />
            <Input
              label="الماركة (Brand)" placeholder="مثلاً: Bosch"
              value={filters.brand} onChange={e => update('brand', e.target.value)}
              icon={<Building2 size={14} />} />
            <Input
              label="ماركة المركبة" placeholder="مثلاً: Toyota"
              value={filters.make} onChange={e => update('make', e.target.value)}
              icon={<Car size={14} />} />
            <Input
              label="موديل المركبة" placeholder="مثلاً: Corolla"
              value={filters.model} onChange={e => update('model', e.target.value)}
              icon={<Car size={14} />} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Input
              label="سنة الصنع من" placeholder="مثلاً: 2015"
              value={filters.yearFrom} onChange={e => update('yearFrom', e.target.value)}
              type="number" />
            <Input
              label="إلى" placeholder="مثلاً: 2024"
              value={filters.yearTo} onChange={e => update('yearTo', e.target.value)}
              type="number" />
          </div>

          <Input
            label="الفئة" placeholder="مثلاً: فلتر، زيت، فرامل"
            value={filters.category} onChange={e => update('category', e.target.value)} />
        </div>
      )}
    </form>
  );
};

export default AdvancedPartSearchPage;
