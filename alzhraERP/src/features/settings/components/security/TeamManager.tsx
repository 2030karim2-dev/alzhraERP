
import React, { useState } from 'react';
import { Users, Mail, Plus, Clock, CheckCircle, XCircle, Trash2, GitBranch } from 'lucide-react';
import Button from '../../../../ui/base/Button';
import Input from '../../../../ui/base/Input';
import { useForm } from 'react-hook-form';
import MicroListItem from '../../../../ui/common/MicroListItem';
import { settingsApi } from '../../api';
import { useAuthStore } from '../../../auth/store';
import { useFeedbackStore } from '../../../feedback/store';
import { useI18nStore } from '@/lib/i18nStore';
import { useBranches, useInvitations, useInvitationMutations } from '../../hooks';

const TeamManager: React.FC = () => {
    const { dictionary: t } = useI18nStore();
    const { user } = useAuthStore();
    const { showToast } = useFeedbackStore();
    const { register, handleSubmit, reset } = useForm();
    const { data: branches } = useBranches();
    const { data: invitations = [] } = useInvitations();
    const { inviteUser, revokeInvitation, isInviting } = useInvitationMutations();

    const handleRemoveInvitation = (id: string) => {
        if (window.confirm(t.confirm_delete || 'هل أنت متأكد من الحذف؟')) {
            revokeInvitation(id);
        }
    };

    const onSubmit = async (data: any) => {
        try {
            const branchId = data.branch_id || null;
            await inviteUser({
                email: data.email,
                role: data.role,
                branchId
            });
            reset();
        } catch (err: any) {
            // Error is handled by mutation
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in duration-500">
            <div className="p-5 border-b dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-950/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-600 text-white rounded-xl shadow-lg shadow-purple-500/20">
                        <Users size={18} />
                    </div>
                    <div>
                        <h3 className="text-[11px] font-bold text-gray-800 dark:text-slate-100 uppercase tracking-tight">
                            {t.team_management || 'إدارة فريق العمل'}
                        </h3>
                        <p className="text-[9px] font-bold text-gray-400">
                            {t.send_invitations_roles || 'إرسال الدعوات وتوزيع الأدوار والفروع'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Invite Form */}
                <div className="lg:col-span-1 space-y-4">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {t.send_new_invitation || 'إرسال دعوة جديدة'}
                    </h4>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                        <Input
                            label={t.email_label || "البريد الإلكتروني"}
                            icon={<Mail />}
                            placeholder="user@example.com"
                            variant="micro"
                            {...register('email', { required: true })}
                            dir="ltr"
                        />

                        {/* Role */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase px-1">
                                {t.job_role || 'الدور الوظيفي'}
                            </label>
                            <select
                                {...register('role')}
                                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-2.5 text-[11px] font-bold outline-none"
                            >
                                <option value="manager">مدير (Manager)</option>
                                <option value="accountant">محاسب (Accountant)</option>
                                <option value="sales">مبيعات (Sales)</option>
                                <option value="staff">موظف (Staff)</option>
                            </select>
                        </div>

                        {/* Branch Assignment */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase px-1 flex items-center gap-1">
                                <GitBranch size={10} />
                                الفرع (اختياري)
                            </label>
                            <select
                                {...register('branch_id')}
                                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-2.5 text-[11px] font-bold outline-none"
                            >
                                <option value="">-- بدون فرع محدد (مدير عام) --</option>
                                {branches?.filter((b: any) => b.status === 'active').map((branch: any) => (
                                    <option key={branch.id} value={branch.id}>
                                        {branch.name}
                                    </option>
                                ))}
                            </select>
                            <p className="text-[9px] text-gray-400 px-1">
                                إذا تركته فارغاً، سيرى الموظف بيانات جميع الفروع
                            </p>
                        </div>

                        <Button
                            type="submit"
                            isLoading={isInviting}
                            className="w-full rounded-xl mt-2 py-2.5 text-[11px] font-bold"
                            leftIcon={<Plus size={14} />}
                        >
                            {t.send_invitation || 'إرسال الدعوة'}
                        </Button>
                    </form>
                </div>

                {/* Invitations List */}
                <div className="lg:col-span-2 space-y-4 border-t lg:border-t-0 lg:border-r dark:border-slate-800 pt-6 lg:pt-0 lg:pr-6">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {t.sent_invitations || 'الدعوات المرسلة'}
                    </h4>
                    <div className="space-y-2">
                        {invitations.map(inv => (
                            <MicroListItem
                                key={inv.id}
                                icon={inv.status === 'pending' ? Clock : (inv.status === 'accepted' ? CheckCircle : XCircle)}
                                iconColorClass={inv.status === 'pending' ? 'text-amber-500' : (inv.status === 'accepted' ? 'text-emerald-500' : 'text-rose-500')}
                                title={inv.email}
                                subtitle={`${t.job_role || 'الدور'}: ${inv.role}${inv.branches?.name ? ` | الفرع: ${inv.branches.name}` : ' | مدير عام'} | إضافة: ${new Date(inv.created_at).toLocaleDateString('ar-SA')}`}
                                tags={[
                                    { label: inv.status === 'pending' ? (t.waiting_for_acceptance || 'بانتظار القبول') : (t.accepted || 'مقبولة'), color: inv.status === 'pending' ? 'amber' : 'emerald' },
                                    ...(inv.branches?.name ? [{ label: `📍 ${inv.branches.name}`, color: 'indigo' as const }] : [{ label: '🌐 مدير عام', color: 'gray' as const }])
                                ]}
                                actions={
                                    inv.status === 'pending' && (
                                        <button
                                            onClick={() => handleRemoveInvitation(inv.id)}
                                            className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )
                                }
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeamManager;
