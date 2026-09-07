import React from 'react';
import { Search } from 'lucide-react';

interface AdminSearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}

/**
 * مربع البحث الموحّد لمركز التحكم — يظهر في شريط أدوات الجداول بدل تكرار نفس
 * البنية في كل جدول (منشآت/مستخدمون).
 */
export const AdminSearchBox: React.FC<AdminSearchBoxProps> = ({
  value,
  onChange,
  placeholder,
  className,
}) => (
  <div className={`relative max-w-full ${className ?? 'w-full sm:w-80'}`}>
    <Search
      className="absolute right-3 top-2.5 text-[var(--app-text-secondary)]"
      size={14}
      aria-hidden="true"
    />
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={e => {
        onChange(e.target.value);
      }}
      aria-label="بحث"
      className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] py-1.5 pe-3 ps-9 text-xs text-[var(--app-text)] placeholder:text-[var(--app-text-secondary)] focus:outline-none"
    />
  </div>
);
