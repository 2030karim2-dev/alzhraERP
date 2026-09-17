import React, { useState } from 'react';
import { Search, Barcode, Hash } from 'lucide-react';
import { cn } from '@/core/utils';
import Input from '@/ui/base/Input';
import Button from '@/ui/base/Button';

interface QuickPartLookupProps {
  onSearch: (query: string, type: 'part_number' | 'oem' | 'barcode') => void;
  className?: string;
}

const QuickPartLookup: React.FC<QuickPartLookupProps> = ({ onSearch, className }) => {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'part_number' | 'oem' | 'barcode'>('part_number');

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim(), searchType);
  };

  const types = [
    { key: 'part_number' as const, label: 'رقم قطعة', icon: <Hash size={12} /> },
    { key: 'oem' as const, label: 'OEM', icon: <Hash size={12} /> },
    { key: 'barcode' as const, label: 'باركود', icon: <Barcode size={12} /> },
  ];

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-3', className)}>
      <div className="flex gap-1.5">
        {types.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setSearchType(t.key);
            }}
            className={cn(
              'flex items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-bold transition-all',
              searchType === t.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-[var(--app-surface-hover)] text-[var(--app-text-secondary)] hover:bg-[var(--app-surface)]'
            )}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder={searchType === 'barcode' ? 'امسح الباركود...' : 'أدخل رقم القطعة...'}
          value={query}
          onChange={e => {
            setQuery(e.target.value);
          }}
          icon={<Search size={14} />}
          className="flex-1"
          autoFocus
        />
        <Button type="submit" variant="primary" size="md">
          بحث
        </Button>
      </div>
    </form>
  );
};

export default QuickPartLookup;
