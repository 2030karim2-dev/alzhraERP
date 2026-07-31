/**
 * CustomerTimelineModal Component
 * A modal wrapper that displays customer timeline with data fetching
 */

import React from 'react';
import { X, History } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerApi } from '../../api';
import CustomerTimeline from './CustomerTimeline';
import AddActivityModal from './AddActivityModal';
import type { Party } from '../../types';
import type { CustomerActivityFormData } from '../../types/enhanced';
import { useState } from 'react';

interface CustomerTimelineModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: Party | null;
}

export const CustomerTimelineModal: React.FC<CustomerTimelineModalProps> = ({
    isOpen,
    onClose,
    customer
}) => {
    const queryClient = useQueryClient();
    const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);

    // Fetch customer activities
    const { data: activities = [], isLoading: activitiesLoading } = useQuery({
        queryKey: ['customer-activities', customer?.id],
        queryFn: () => customerApi.getCustomerActivities(customer!.id),
        enabled: !!customer?.id && isOpen
    });

    // Fetch customer notes
    const { data: notes = [], isLoading: notesLoading } = useQuery({
        queryKey: ['customer-notes', customer?.id],
        queryFn: () => customerApi.getCustomerNotes(customer!.id),
        enabled: !!customer?.id && isOpen
    });

    // Add activity mutation
    const addActivityMutation = useMutation({
        mutationFn: (data: CustomerActivityFormData) =>
            customerApi.createActivity({
                ...data,
                customerId: customer!.id,
                companyId: customer!.company_id
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customer-activities', customer?.id] });
            setIsAddActivityOpen(false);
        }
    });

    // Complete activity mutation
    const completeActivityMutation = useMutation({
        mutationFn: (id: string) => customerApi.completeActivity(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customer-activities', customer?.id] });
        }
    });

    // Delete activity mutation
    const deleteActivityMutation = useMutation({
        mutationFn: (id: string) => customerApi.deleteActivity(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customer-activities', customer?.id] });
        }
    });

    // Add note mutation
    const addNoteMutation = useMutation({
        mutationFn: (content: string) =>
            customerApi.addNote({
                noteType: 'general',
                content,
                customerId: customer!.id,
                companyId: customer!.company_id
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customer-notes', customer?.id] });
        }
    });

    if (!isOpen || !customer) return null;

    const isLoading = activitiesLoading || notesLoading;

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                <History className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    تاريخ العميل
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-slate-400">
                                    {customer.name}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full" />
                            </div>
                        ) : (
                            <CustomerTimeline
                                activities={activities}
                                notes={notes}
                                onAddActivity={() => setIsAddActivityOpen(true)}
                                onAddNote={() => {
                                    const content = prompt('أدخل الملاحظة:');
                                    if (content) addNoteMutation.mutate(content);
                                }}
                                onEditActivity={(activity) => {
                                    // For now, just alert. Can be expanded later
                                    alert(`تعديل النشاط: ${activity.subject}`);
                                }}
                                onDeleteActivity={(id) => {
                                    if (confirm('هل أنت متأكد من حذف هذا النشاط؟')) {
                                        deleteActivityMutation.mutate(id);
                                    }
                                }}
                                onCompleteActivity={(id) => {
                                    completeActivityMutation.mutate(id);
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Add Activity Modal */}
            <AddActivityModal
                isOpen={isAddActivityOpen}
                onClose={() => setIsAddActivityOpen(false)}
                onSubmit={(data) => addActivityMutation.mutate(data)}
                customerName={customer.name}
            />
        </>
    );
};

export default CustomerTimelineModal;
