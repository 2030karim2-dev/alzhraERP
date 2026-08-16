// ============================================
// MetaSelect — قائمة منسدلة مخصصة لحقول وصف الفاتورة
// تحل محل <select> الأصلي لأن قائمته تُرسم بواسطة نظام التشغيل
// ولا يمكن تنسيقها للوضع الليلي، ولا تضمن ظهورها أسفل الحقل.
// القائمة هنا عنصر DOM فعلي بتنسيق Tailwind كامل للوضعين
// الفاتح والداكن مع إغلاق عند النقر خارجاً وتنقل بلوحة المفاتيح.
// ============================================
/* eslint-disable max-lines-per-function, security/detect-object-injection, @typescript-eslint/explicit-function-return-type */
import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface MetaSelectOption {
    id: string;
    label: string;
}

interface MetaSelectProps {
    value: string;
    onChange: (value: string) => void;
    options?: MetaSelectOption[];
    placeholder?: string;
    disabled?: boolean;
}

const optionClassName = (isHighlighted: boolean, isSelected: boolean): string => {
    if (isHighlighted) return 'bg-blue-600 text-white';
    if (isSelected) return 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300';
    return 'text-gray-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800';
};

const selectedLabelClassName = (selected: MetaSelectOption | undefined): string => selected === undefined ? 'text-blue-300 dark:text-slate-500' : '';

const MetaSelect: React.FC<MetaSelectProps> = ({
    value,
    onChange,
    options = [],
    placeholder = 'اختر...',
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const selected = options.find(opt => opt.id === value);

    // إغلاق القائمة عند النقر خارجها أو الضغط على Escape
    useEffect(() => {
        const handleMouseDown = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    // مزامنة السطر المميز مع القيمة الحالية عند الفتح
    useEffect(() => {
        if (!isOpen) return;
        const idx = options.findIndex(opt => opt.id === value);
        setHighlightedIndex(idx);
    }, [isOpen, options, value]);

    // تمرير السطر المميز إلى مجال الرؤية داخل القائمة
    useEffect(() => {
        if (!isOpen) return;
        const listEl = listRef.current;
        const itemEl = listEl?.children[highlightedIndex] as HTMLElement | undefined;
        itemEl?.scrollIntoView({ block: 'nearest' });
    }, [isOpen, highlightedIndex]);

    const selectOption = (id: string) => {
        onChange(id);
        setIsOpen(false);
    };

    const navigateAndSelect = (event: React.KeyboardEvent) => {
        if (options.length === 0) return;
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                setHighlightedIndex(prev => Math.min(prev + 1, options.length - 1));
                break;
            case 'ArrowUp':
                event.preventDefault();
                setHighlightedIndex(prev => Math.max(prev - 1, 0));
                break;
            case 'Enter':
            case ' ':
                event.preventDefault();
                if (highlightedIndex >= 0) {
                    selectOption(options[highlightedIndex].id);
                }
                break;
            case 'Escape':
                event.preventDefault();
                setIsOpen(false);
                break;
            case 'Tab':
                setIsOpen(false);
                break;
        }
    };

    const handleButtonKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (disabled) return;
        if (!isOpen) {
            if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setIsOpen(true);
            }
            return;
        }
        navigateAndSelect(event);
    };

    return (
        <div className={`relative ${isOpen ? 'z-[60]' : 'z-0'}`} ref={containerRef}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => {
                    if (!disabled) setIsOpen(prev => !prev);
                }}
                onKeyDown={handleButtonKeyDown}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                className="w-full min-h-4 max-md:min-h-3 flex items-center justify-between gap-1 bg-transparent text-[11px] max-md:text-[7px] font-bold outline-none cursor-pointer text-blue-900 dark:text-white text-right leading-none"
            >
                                    <span className={`truncate ${selectedLabelClassName(selected)}`}>

                    {selected?.label ?? placeholder}
                </span>
                <ChevronDown size={12} className={`shrink-0 transition-transform text-blue-400 dark:text-blue-600 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div
                    ref={listRef}
                    role="listbox"
                    tabIndex={0}
                    className="absolute top-full left-0 right-0 z-[70] mt-0.5 max-h-44 max-md:max-h-36 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900 border-2 border-blue-500 dark:border-slate-700 shadow-2xl rounded-md py-1 outline-none"
                >
                    {options.length === 0 ? (
                        <div className="px-3 py-2 text-[10px] font-bold text-gray-400 dark:text-slate-500">لا توجد خيارات</div>
                    ) : (
                        options.map((opt, index) => {
                            const isSelected = opt.id === value;
                            const isHighlighted = index === highlightedIndex;
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => { selectOption(opt.id); }}
                                    onMouseEnter={() => { setHighlightedIndex(index); }}
                                    className={`w-full flex items-center justify-between gap-2 px-3 max-md:px-1.5 py-1.5 max-md:py-1 text-[10px] max-md:text-[8px] md:text-[11px] font-bold text-right transition-colors ${optionClassName(isHighlighted, isSelected)}`}
                                >
                                    <span className="truncate">{opt.label}</span>
                                    {isSelected && <Check size={12} className="shrink-0" />}
                                </button>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
};

export default MetaSelect;
