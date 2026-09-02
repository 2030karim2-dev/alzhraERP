/**
 * CustomerTimeline Component
 * Displays a chronological timeline of all customer activities, notes, and interactions
 */

import React, { useState } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Phone,
  Mail,
  Calendar,
  MapPin,
  FileText,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  ShoppingCart,
  CreditCard,
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
} from 'lucide-react';
import type {
  CustomerActivity,
  CustomerNote,
  ActivityType,
  ActivityStatus,
} from '../../types/enhanced';

interface TimelineItem {
  id: string;
  type: 'activity' | 'note' | 'invoice' | 'payment';
  date: string;
  title: string;
  description?: string | undefined;
  status?: ActivityStatus | undefined;
  priority?: 'low' | 'medium' | 'high' | 'urgent' | undefined;
  createdBy?: string | undefined;
  data?: CustomerActivity | CustomerNote | undefined;
}

interface CustomerTimelineProps {
  activities: CustomerActivity[];
  notes: CustomerNote[];
  onAddActivity: () => void;
  onAddNote: () => void;
  onEditActivity: (activity: CustomerActivity) => void;
  onDeleteActivity: (id: string) => void;
  onCompleteActivity: (id: string) => void;
}

const activityIcons: Record<ActivityType, React.ReactNode> = {
  call: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  meeting: <Calendar className="h-4 w-4" />,
  visit: <MapPin className="h-4 w-4" />,
  note: <FileText className="h-4 w-4" />,
  task: <CheckCircle className="h-4 w-4" />,
  invoice_created: <ShoppingCart className="h-4 w-4" />,
  payment_received: <CreditCard className="h-4 w-4" />,
  complaint: <AlertCircle className="h-4 w-4" />,
  follow_up: <MessageSquare className="h-4 w-4" />,
};

const activityColors: Record<ActivityType, string> = {
  call: 'bg-blue-500',
  email: 'bg-green-500',
  meeting: 'bg-purple-500',
  visit: 'bg-orange-500',
  note: 'bg-gray-500',
  task: 'bg-indigo-500',
  invoice_created: 'bg-emerald-500',
  payment_received: 'bg-teal-500',
  complaint: 'bg-red-500',
  follow_up: 'bg-yellow-500',
};

const statusColors: Record<ActivityStatus, string> = {
  pending: 'text-yellow-600 bg-yellow-50',
  completed: 'text-green-600 bg-green-50',
  cancelled: 'text-gray-600 bg-gray-50',
  overdue: 'text-red-600 bg-red-50',
};

const priorityColors = {
  low: 'text-gray-600',
  medium: 'text-blue-600',
  high: 'text-orange-600',
  urgent: 'text-red-600',
};

export const CustomerTimeline: React.FC<CustomerTimelineProps> = ({
  activities,
  notes,
  onAddActivity,
  onAddNote,
  onEditActivity,
  onDeleteActivity,
  onCompleteActivity,
}) => {
  const [filter, setFilter] = useState<'all' | 'activities' | 'notes'>('all');

  // Combine and sort timeline items
  const timelineItems: TimelineItem[] = [
    ...activities.map(activity => ({
      id: activity.id,
      type: 'activity' as const,
      date: activity.scheduledAt || activity.createdAt,
      title: activity.subject,
      description: activity.description,
      status: activity.status,
      priority: activity.priority,
      createdBy: activity.createdByName,
      data: activity,
    })),
    ...notes.map(note => ({
      id: note.id,
      type: 'note' as const,
      date: note.createdAt,
      title:
        note.noteType === 'general'
          ? 'ملاحظة'
          : note.noteType === 'complaint'
            ? 'شكوى'
            : note.noteType === 'feedback'
              ? 'تقييم'
              : note.noteType === 'preference'
                ? 'تفضيل'
                : 'تحذير',
      description: note.content,
      createdBy: note.createdByName,
      data: note,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredItems =
    filter === 'all'
      ? timelineItems
      : timelineItems.filter(item => {
          if (filter === 'activities') return item.type === 'activity';
          if (filter === 'notes') return item.type === 'note';
          return false;
        });

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMMM yyyy HH:mm', { locale: ar });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">التاريخ الزمني للعميل</h3>
          <div className="flex gap-2">
            <button
              onClick={onAddNote}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <Plus className="h-4 w-4" />
              ملاحظة
            </button>
            <button
              onClick={onAddActivity}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              نشاط
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {(['all', 'activities', 'notes'] as const).map(filterType => (
            <button
              key={filterType}
              onClick={() => {
                setFilter(filterType);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                filter === filterType ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {filterType === 'all' && 'الكل'}
              {filterType === 'activities' && 'الأنشطة'}
              {filterType === 'notes' && 'الملاحظات'}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="max-h-[600px] overflow-y-auto p-4">
        {filteredItems.length === 0 ? (
          <div className="py-8 text-center text-gray-500">لا يوجد سجل حتى الآن</div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute bottom-0 right-6 top-0 w-0.5 bg-gray-200" />

            {filteredItems.map((item, index) => (
              <div
                key={item.id}
                className={`relative flex gap-4 ${index !== filteredItems.length - 1 ? 'mb-6' : ''}`}
              >
                {/* Icon */}
                <div
                  className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white ${
                    item.type === 'activity' && item.data
                      ? activityColors[(item.data as CustomerActivity).activityType]
                      : item.type === 'note'
                        ? 'bg-gray-400'
                        : 'bg-blue-500'
                  }`}
                >
                  {item.type === 'activity' && item.data ? (
                    activityIcons[(item.data as CustomerActivity).activityType]
                  ) : item.type === 'note' ? (
                    <FileText className="h-4 w-4" />
                  ) : (
                    <MoreHorizontal className="h-4 w-4" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 rounded-lg bg-gray-50 p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{item.title}</span>
                        {item.status && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${statusColors[item.status]}`}
                          >
                            {item.status === 'pending' && 'معلق'}
                            {item.status === 'completed' && 'مكتمل'}
                            {item.status === 'cancelled' && 'ملغي'}
                            {item.status === 'overdue' && 'متأخر'}
                          </span>
                        )}
                        {item.priority && (
                          <span className={`text-xs ${priorityColors[item.priority]}`}>
                            {item.priority === 'low' && 'منخفض'}
                            {item.priority === 'medium' && 'متوسط'}
                            {item.priority === 'high' && 'عالي'}
                            {item.priority === 'urgent' && 'عاجل'}
                          </span>
                        )}
                      </div>

                      {item.description && (
                        <p className="mb-2 text-sm text-gray-600">{item.description}</p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{formatDate(item.date)}</span>
                        {item.createdBy && <span>بواسطة: {item.createdBy}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    {item.type === 'activity' && item.status === 'pending' && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            onCompleteActivity(item.id);
                          }}
                          className="rounded p-1 text-green-600 hover:bg-green-50"
                          title="تحديد كمكتمل"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            onEditActivity(item.data as CustomerActivity);
                          }}
                          className="rounded p-1 text-blue-600 hover:bg-blue-50"
                          title="تعديل"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            onDeleteActivity(item.id);
                          }}
                          className="rounded p-1 text-red-600 hover:bg-red-50"
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerTimeline;
