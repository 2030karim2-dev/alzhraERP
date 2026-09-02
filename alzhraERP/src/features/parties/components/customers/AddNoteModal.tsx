/**
 * AddNoteModal Component
 * Modal for adding new customer notes with type selection
 */

import React, { useState } from 'react';
import { StickyNote, AlertCircle, CheckCircle, Info } from 'lucide-react';
import Modal from '../../../../ui/base/Modal';
import Button from '../../../../ui/base/Button';
import type { CustomerNoteFormData, NoteType } from '../../types/enhanced';

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CustomerNoteFormData) => void;
  customerName: string;
}

const noteTypes: Array<{ value: NoteType; label: string; icon: any; color: string }> = [
  { value: 'general', label: 'عامة', icon: StickyNote, color: 'text-blue-500' },
  { value: 'complaint', label: 'شكوى', icon: AlertCircle, color: 'text-rose-500' },
  { value: 'feedback', label: 'رأي / ملاحظة', icon: Info, color: 'text-amber-500' },
  { value: 'preference', label: 'تفضيلات', icon: CheckCircle, color: 'text-emerald-500' },
  { value: 'warning', label: 'تحذير', icon: AlertCircle, color: 'text-red-600' },
];

export const AddNoteModal: React.FC<AddNoteModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  customerName,
}) => {
  const [content, setContent] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('general');
  const [isImportant, setIsImportant] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim()) return;

    onSubmit({
      content: content.trim(),
      noteType,
      isImportant,
    });

    // Reset and close
    setContent('');
    setNoteType('general');
    setIsImportant(false);
  };

  const footer = (
    <div className="flex w-full items-center justify-end gap-2">
      <Button variant="ghost" onClick={onClose}>
        إلغاء
      </Button>
      <Button
        variant="primary"
        onClick={() => {
          handleSubmit();
        }}
        disabled={!content.trim()}
      >
        حفظ الملاحظة
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={StickyNote}
      title="إضافة ملاحظة للعميل"
      description={customerName}
      footer={footer}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Note Type Selection */}
        <div className="grid grid-cols-3 gap-2">
          {noteTypes.map(type => {
            const Icon = type.icon;
            const isSelected = noteType === type.value;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => {
                  setNoteType(type.value);
                }}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'border-gray-100 hover:border-gray-200 dark:border-slate-800 dark:hover:border-slate-700'
                }`}
              >
                <Icon size={18} className={isSelected ? 'text-blue-500' : type.color} />
                <span className="text-[10px] font-bold">{type.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex flex-col gap-1.5">
          <label className="px-1 text-xs font-bold text-gray-500">محتوى الملاحظة</label>
          <textarea
            value={content}
            onChange={e => {
              setContent(e.target.value);
            }}
            rows={4}
            className="w-full resize-none rounded-xl border border-gray-100 bg-[var(--app-surface)] p-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 dark:border-slate-800"
          />
        </div>

        {/* Importance Toggle */}
        <label className="group flex cursor-pointer items-center gap-2">
          <div
            onClick={() => {
              setIsImportant(!isImportant);
            }}
            className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
              isImportant
                ? 'border-amber-500 bg-amber-500'
                : 'border-gray-300 dark:border-slate-600'
            }`}
          >
            {isImportant && <CheckCircle size={12} className="text-white" />}
          </div>
          <span className="text-xs font-bold text-[var(--app-text)] transition-colors group-hover:text-amber-500">
            تمييز كملاحظة هامة
          </span>
        </label>
      </form>
    </Modal>
  );
};

export default AddNoteModal;
