import React from 'react';
import { LayoutGrid, Columns, AlignJustify, Monitor } from 'lucide-react';
import { cn } from '@/core/utils';

export type POSLayout = 'classic' | 'compact' | 'arabic' | 'fullscreen';

interface POSLayoutSwitcherProps {
  current: POSLayout;
  onChange: (layout: POSLayout) => void;
  className?: string;
}

const layouts: { key: POSLayout; label: string; icon: React.ReactNode; desc: string }[] = [
  { key: 'classic', label: 'كلاسيكي', icon: <LayoutGrid size={14} />, desc: 'قائمة منتجات + سلة الشراء' },
  { key: 'compact', label: 'مدمج', icon: <Columns size={14} />, desc: 'تخطيط عمودي موفر للمساحة' },
  { key: 'arabic', label: 'عربي', icon: <AlignJustify size={14} />, desc: 'تخطيط RTL محسّن للغة العربية' },
  { key: 'fullscreen', label: 'شاشة كاملة', icon: <Monitor size={14} />, desc: 'وضع ملء الشاشة للشاشات الكبيرة' },
];

const POSLayoutSwitcher: React.FC<POSLayoutSwitcherProps> = ({ current, onChange, className }) => {
  return (
    <div className={cn('flex items-center gap-1 p-1 bg-[var(--app-bg)] rounded-xl', className)}>
      {layouts.map((layout) => (
        <button
          key={layout.key}
          onClick={() => onChange(layout.key)}
          title={layout.desc}
          aria-label={`تخطيط ${layout.label}`}
          aria-pressed={current === layout.key}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold transition-all duration-200',
            current === layout.key
              ? 'bg-[var(--app-surface)] text-[var(--accent)] shadow-sm border border-[var(--app-border)]'
              : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]',
          )}
        >
          {layout.icon}
          <span className="hidden sm:inline">{layout.label}</span>
        </button>
      ))}
    </div>
  );
};

export default POSLayoutSwitcher;
