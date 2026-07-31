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
    Trash2
} from 'lucide-react';
import type {
    CustomerActivity,
    CustomerNote,
    ActivityType,
    ActivityStatus
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
    call: <Phone className="w-4 h-4" />,
    email: <Mail className="w-4 h-4" />,
    meeting: <Calendar className="w-4 h-4" />,
    visit: <MapPin className="w-4 h-4" />,
    note: <FileText className="w-4 h-4" />,
    task: <CheckCircle className="w-4 h-4" />,
    invoice_created: <ShoppingCart className="w-4 h-4" />,
    payment_received: <CreditCard className="w-4 h-4" />,
    complaint: <AlertCircle className="w-4 h-4" />,
    follow_up: <MessageSquare className="w-4 h-4" />
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
    follow_up: 'bg-yellow-500'
};

const statusColors: Record<ActivityStatus, string> = {
    pending: 'text-yellow-600 bg-yellow-50',
    completed: 'text-green-600 bg-green-50',
    cancelled: 'text-gray-600 bg-gray-50',
    overdue: 'text-red-600 bg-red-50'
};

const priorityColors = {
    low: 'text-gray-600',
    medium: 'text-blue-600',
    high: 'text-orange-600',
    urgent: 'text-red-600'
};

export const CustomerTimeline: React.FC<CustomerTimelineProps> = ({
    activities,
    notes,
    onAddActivity,
    onAddNote,
    onEditActivity,
    onDeleteActivity,
    onCompleteActivity
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
            data: activity
        })),
        ...notes.map(note => ({
            id: note.id,
            type: 'note' as const,
            date: note.createdAt,
            title: note.noteType === 'general' ? 'ملاحظة' :
                note.noteType === 'complaint' ? 'شكوى' :
                    note.noteType === 'feedback' ? 'تقييم' :
                        note.noteType === 'preference' ? 'تفضيل' : 'تحذير',
            description: note.content,
            createdBy: note.createdByName,
            data: note
        }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const filteredItems = filter === 'all'
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">التاريخ الزمني للعميل</h3>
                    <div className="flex gap-2">
                        <button
                            onClick={onAddNote}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            ملاحظة
                        </button>
                        <button
                            onClick={onAddActivity}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            نشاط
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                    {(['all', 'activities', 'notes'] as const).map((filterType) => (
                        <button
                            key={filterType}
                            onClick={() => setFilter(filterType)}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${filter === filterType
                                ? 'bg-gray-900 text-white'
                                : 'text-gray-600 hover:bg-gray-100'
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
            <div className="p-4 max-h-[600px] overflow-y-auto">
                {filteredItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        لا يوجد سجل حتى الآن
                    </div>
                ) : (
                    <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute right-6 top-0 bottom-0 w-0.5 bg-gray-200" />

                        {filteredItems.map((item, index) => (
                            <div
                                key={item.id}
                                className={`relative flex gap-4 ${index !== filteredItems.length - 1 ? 'mb-6' : ''}`}
                            >
                                {/* Icon */}
                                <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0 ${item.type === 'activity' && item.data
                                    ? activityColors[(item.data as CustomerActivity).activityType]
                                    : item.type === 'note'
                                        ? 'bg-gray-400'
                                        : 'bg-blue-500'
                                    }`}>
                                    {item.type === 'activity' && item.data
                                        ? activityIcons[(item.data as CustomerActivity).activityType]
                                        : item.type === 'note'
                                            ? <FileText className="w-4 h-4" />
                                            : <MoreHorizontal className="w-4 h-4" />
                                    }
                                </div>

                                {/* Content */}
                                <div className="flex-1 bg-gray-50 rounded-lg p-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold text-gray-900">{item.title}</span>
                                                {item.status && (
                                                    <span className={`px-2 py-0.5 text-xs rounded-full ${statusColors[item.status]}`}>
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
                                                <p className="text-sm text-gray-600 mb-2">{item.description}</p>
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
                                                    onClick={() => onCompleteActivity(item.id)}
                                                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                    title="تحديد كمكتمل"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => onEditActivity(item.data as CustomerActivity)}
                                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                    title="تعديل"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => onDeleteActivity(item.id)}
                                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                    title="حذف"
                                                >
                                                    <Trash2 className="w-4 h-4" />
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
