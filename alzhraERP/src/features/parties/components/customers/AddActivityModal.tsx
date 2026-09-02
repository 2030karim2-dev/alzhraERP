/**
 * AddActivityModal Component
 * Modal for adding new customer activities (calls, meetings, tasks, etc.)
 */

import React, { useState } from 'react';
import { X, Calendar, AlertCircle } from 'lucide-react';
import type { CustomerActivityFormData, ActivityType, Priority } from '../../types/enhanced';

interface AddActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CustomerActivityFormData) => void;
  customerName: string;
}

const activityTypes: Array<{ value: ActivityType; label: string; color: string }> = [
  { value: 'call', label: 'مكالمة هاتفية', color: 'bg-blue-500' },
  { value: 'email', label: 'بريد إلكتروني', color: 'bg-green-500' },
  { value: 'meeting', label: 'اجتماع', color: 'bg-purple-500' },
  { value: 'visit', label: 'زيارة', color: 'bg-orange-500' },
  { value: 'task', label: 'مهمة', color: 'bg-indigo-500' },
  { value: 'follow_up', label: 'متابعة', color: 'bg-yellow-500' },
  { value: 'complaint', label: 'شكوى', color: 'bg-red-500' },
];

const priorities: Array<{ value: Priority; label: string; color: string }> = [
  { value: 'low', label: 'منخفض', color: 'text-gray-600' },
  { value: 'medium', label: 'متوسط', color: 'text-blue-600' },
  { value: 'high', label: 'عالي', color: 'text-orange-600' },
  { value: 'urgent', label: 'عاجل', color: 'text-red-600' },
];

export const AddActivityModal: React.FC<AddActivityModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  customerName,
}) => {
  const [formData, setFormData] = useState<CustomerActivityFormData>({
    activityType: 'call',
    subject: '',
    description: '',
    priority: 'medium',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
      setFormData({
        activityType: 'call',
        subject: '',
        description: '',
        priority: 'medium',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-lg rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">إضافة نشاط جديد</h3>
            <p className="text-sm text-gray-500">العميل: {customerName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          {/* Activity Type */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">نوع النشاط</label>
            <div className="grid grid-cols-3 gap-2">
              {activityTypes.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, activityType: type.value });
                  }}
                  className={`flex items-center gap-2 rounded-lg border p-2 transition-all ${
                    formData.activityType === type.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`h-3 w-3 rounded-full ${type.color}`} />
                  <span className="text-sm">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              العنوان <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={e => {
                setFormData({ ...formData, subject: e.target.value });
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">التفاصيل</label>
            <textarea
              value={formData.description}
              onChange={e => {
                setFormData({ ...formData, description: e.target.value });
              }}
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Schedule Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                <Calendar className="ml-1 inline-block h-4 w-4" />
                تاريخ وميعاد
              </label>
              <input
                type="datetime-local"
                value={formData.scheduledAt || ''}
                onChange={e => {
                  setFormData({ ...formData, scheduledAt: e.target.value });
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                <AlertCircle className="ml-1 inline-block h-4 w-4" />
                الأولوية
              </label>
              <select
                value={formData.priority}
                onChange={e => {
                  setFormData({ ...formData, priority: e.target.value as Priority });
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {priorities.map(p => (
                  <option key={p.value} value={p.value} className={p.color}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-gray-700 transition-colors hover:bg-gray-100"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.subject.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'جاري الإضافة...' : 'إضافة النشاط'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddActivityModal;
