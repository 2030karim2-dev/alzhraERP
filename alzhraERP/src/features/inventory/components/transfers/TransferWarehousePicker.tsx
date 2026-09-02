import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Box, ArrowLeftRight, ChevronDown, Warehouse } from 'lucide-react';
import { cn } from '../../../../core/utils';

interface Props {
  warehouses: any[] | undefined;
  fromWh: string;
  setFromWh: (id: string) => void;
  toWh: string;
  setToWh: (id: string) => void;
}

const CustomSelect = ({
  value,
  onChange,
  options,
  placeholder,
  iconColorClass,
  borderColorClass,
  focusRingClass,
}: {
  value: string;
  onChange: (v: string) => void;
  options: any[];
  placeholder: string;
  iconColorClass: string;
  borderColorClass: string;
  focusRingClass: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  });

  // NUCLEAR DATA FALLBACK: Check all possible name fields
  const getOptionName = (opt: any) => opt?.name_ar || opt?.name || opt?.title || 'بدون اسم';

  const selected = options?.find((o: any) => o.id === value);
  const selectedName = getOptionName(selected);

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
      return () => {
        window.removeEventListener('resize', updateCoords);
        window.removeEventListener('scroll', updateCoords, true);
      };
    }
    return undefined;
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        const menu = document.getElementById('portal-select-menu');
        if (menu && menu.contains(event.target as Node)) return;
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // NUCLEAR STYLING: Force background and text color to bypass ANY theme conflict
  const dropdownMenu =
    isOpen &&
    createPortal(
      <div
        id="portal-select-menu"
        className="animate-in fade-in slide-in-from-top-1 fixed z-[99999] overflow-hidden rounded-xl border-2 px-1.5 py-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        style={{
          top: coords.top + 6,
          left: coords.left,
          width: coords.width,
          maxHeight: '300px',
          backgroundColor: '#ffffff', // Force white background for light mode
          borderColor: '#e2e8f0',
          color: '#1e293b', // Force dark text
        }}
      >
        {/* Forced Dark Mode Support via class name injection if root is dark */}
        <div
          className={cn(
            'h-full w-full',
            document.documentElement.classList.contains('dark')
              ? 'dark bg-[#1e293b] text-white'
              : 'bg-white text-slate-900'
          )}
          style={{ borderRadius: '10px' }}
        >
          <div className="custom-scrollbar max-h-[280px] overflow-y-auto p-1">
            {options?.map((w: any) => {
              const name = getOptionName(w);
              return (
                <div
                  key={w.id}
                  onClick={() => {
                    onChange(w.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'mb-1 flex cursor-pointer items-center justify-between rounded-lg border border-transparent p-3 text-sm font-black transition-all last:mb-0',
                    value === w.id
                      ? 'border-blue-400 bg-blue-600 text-white shadow-md'
                      : 'hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-slate-700 dark:hover:text-blue-200'
                  )}
                  style={{
                    // Extreme fallback for visibility
                    color: value === w.id ? 'white' : undefined,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                        value === w.id ? 'bg-blue-500' : 'bg-slate-100 dark:bg-slate-800'
                      )}
                    >
                      <Warehouse
                        size={16}
                        className={value === w.id ? 'text-white' : 'text-slate-500'}
                      />
                    </div>
                    <span className="truncate">{name}</span>
                  </div>
                  {value === w.id && (
                    <div className="h-2 w-2 rounded-full bg-white shadow-[0_0_8px_white]" />
                  )}
                </div>
              );
            })}
            {(!options || options.length === 0) && (
              <div className="p-4 text-center">
                <p className="text-xs font-bold text-slate-400">لا توجد مستودعات متاحة</p>
              </div>
            )}
          </div>
        </div>
      </div>,
      document.body
    );

  return (
    <div className="relative" ref={containerRef}>
      <div
        onClick={() => {
          setIsOpen(!isOpen);
        }}
        className={cn(
          'group/select flex w-full cursor-pointer items-center justify-between rounded-xl border-2 bg-[var(--app-surface)] px-4 py-3 text-sm font-black shadow-md outline-none transition-all',
          isOpen ? borderColorClass : 'border-[var(--app-border)]',
          isOpen ? focusRingClass : 'hover:border-slate-400',
          selected ? 'text-[var(--app-text)]' : 'text-[var(--app-text-secondary)]'
        )}
      >
        <div className="flex items-center gap-3 truncate">
          <Warehouse
            size={18}
            className={cn(
              'shrink-0',
              selected ? iconColorClass : 'text-[var(--app-text-secondary)] opacity-50'
            )}
          />
          <span className="truncate">{selectedName || placeholder || 'اختر المستودع...'}</span>
        </div>
        <ChevronDown
          size={20}
          className={cn(
            'shrink-0 transition-transform',
            iconColorClass,
            isOpen ? 'rotate-180' : ''
          )}
        />
      </div>
      {dropdownMenu}
    </div>
  );
};

const TransferWarehousePicker: React.FC<Props> = ({
  warehouses,
  fromWh,
  setFromWh,
  toWh,
  setToWh,
}) => {
  return (
    <div className="relative grid grid-cols-1 gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-2 shadow-sm md:grid-cols-2">
      <div className="space-y-1">
        <label className="mb-0.5 flex w-fit items-center gap-1.5 rounded border border-rose-100 bg-[var(--app-bg)] px-2 py-0.5 text-[11px] font-black uppercase text-rose-600 dark:border-rose-900/30">
          <Box size={11} />
          من مستودع (المصدر)
        </label>
        <CustomSelect
          value={fromWh}
          onChange={setFromWh}
          options={warehouses || []}
          placeholder="اختر المستودع المصدر..."
          iconColorClass="text-rose-600"
          borderColorClass="border-rose-600"
          focusRingClass="ring-4 ring-rose-500/20"
        />
      </div>

      <div className="absolute left-1/2 top-1/2 z-10 hidden h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text-secondary)] shadow-lg md:flex">
        <ArrowLeftRight size={16} />
      </div>

      <div className="space-y-1">
        <label className="mb-0.5 flex w-fit items-center gap-1.5 rounded border border-emerald-100 bg-[var(--app-bg)] px-2 py-0.5 text-[11px] font-black uppercase text-emerald-600 dark:border-emerald-900/30">
          <Box size={11} />
          إلى مستودع (الوجهة)
        </label>
        <CustomSelect
          value={toWh}
          onChange={setToWh}
          options={warehouses || []}
          placeholder="اختر المستودع الوجهة..."
          iconColorClass="text-emerald-600"
          borderColorClass="border-emerald-600"
          focusRingClass="ring-4 ring-emerald-500/20"
        />
      </div>
    </div>
  );
};

export default TransferWarehousePicker;
