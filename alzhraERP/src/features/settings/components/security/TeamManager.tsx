import React, { useState } from 'react';
import {
  Users,
  Mail,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  GitBranch,
  Shield,
  UserCheck,
  Building2,
  Key,
} from 'lucide-react';
import Button from '../../../../ui/base/Button';
import Input from '../../../../ui/base/Input';
import { useForm } from 'react-hook-form';
import MicroListItem from '../../../../ui/common/MicroListItem';
import { useI18nStore } from '@/lib/i18nStore';
import { useBranches, useInvitations, useInvitationMutations } from '../../hooks';
import { useCompanyMembers, type CompanyMember } from '../../hooks/useUserPermissions';
import EmployeePermissionsModal from './EmployeePermissionsModal';
import { cn } from '../../../../core/utils';

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  owner: {
    label: 'مالك المنشأة (Owner)',
    color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  },
  admin: {
    label: 'مدير نظام (Admin)',
    color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
  },
  manager: {
    label: 'مدير (Manager)',
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  },
  accountant: {
    label: 'محاسب (Accountant)',
    color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  },
  sales: {
    label: 'مبيعات (Sales)',
    color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  },
  viewer: {
    label: 'مشاهد (Viewer)',
    color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  },
};

const TeamManager: React.FC = () => {
  const { dictionary: t } = useI18nStore();
  const { register, handleSubmit, reset } = useForm();
  const { data: branches = [] } = useBranches();
  const { data: invitations = [] } = useInvitations();
  const { inviteUser, revokeInvitation, isInviting } = useInvitationMutations();
  const { data: members = [], isLoading: isMembersLoading } = useCompanyMembers();

  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members');
  const [selectedMemberForPerms, setSelectedMemberForPerms] = useState<CompanyMember | null>(null);

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
        branchId,
      });
      reset();
    } catch (err: any) {
      // Handled by mutation toast
    }
  };

  return (
    <div className="animate-in fade-in overflow-hidden rounded-3xl border border-gray-100 bg-[var(--app-surface)] shadow-sm duration-500 dark:border-slate-800">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b bg-gray-50/50 p-5 dark:border-slate-800 dark:bg-slate-950/50 max-md:p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-purple-600 p-2.5 text-white shadow-lg shadow-purple-500/20">
            <Users size={20} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-gray-900 dark:text-slate-100">
              {t.team_management || 'إدارة فريق العمل والصلاحيات'}
            </h3>
            <p className="text-[10px] font-bold text-gray-400">
              توزيع الأدوار، الفروع، وتخصيص صلاحيات الوصول لكل موظف
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 rounded-2xl bg-gray-200/60 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab('members');
            }}
            className={cn(
              'flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all',
              activeTab === 'members'
                ? 'bg-[var(--app-surface)] text-purple-600 shadow-sm dark:text-purple-400'
                : 'text-gray-600 hover:text-gray-900 dark:text-slate-400'
            )}
          >
            <UserCheck size={14} />
            أعضاء الفريق ({members.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('invitations');
            }}
            className={cn(
              'flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all',
              activeTab === 'invitations'
                ? 'bg-[var(--app-surface)] text-purple-600 shadow-sm dark:text-purple-400'
                : 'text-gray-600 hover:text-gray-900 dark:text-slate-400'
            )}
          >
            <Mail size={14} />
            الدعوات ({invitations.length})
          </button>
        </div>
      </div>

      {/* TAB 1: Active Team Members */}
      {activeTab === 'members' && (
        <div className="space-y-4 p-5 max-md:p-4">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-2 text-xs font-extrabold text-gray-700 dark:text-slate-300">
              <Shield size={14} className="text-purple-500" />
              الموظفون المسجلون في المنشأة
            </h4>
            <span className="text-[10px] text-gray-400">
              انقر على "تخصيص الصلاحيات" لتحديد صلاحيات فردية لأي موظف
            </span>
          </div>

          {isMembersLoading ? (
            <div className="py-12 text-center text-xs font-bold text-gray-400">
              جاري تحميل قائمة أعضاء الفريق...
            </div>
          ) : members.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-12 text-center text-xs font-bold text-gray-400 dark:border-slate-800 dark:bg-slate-950/30">
              لا يوجد أعضاء مسجلين حالياً. يمكنك إرسال دعوة للانضمام من تبويب الدعوات.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
              {members.map(member => {
                const roleInfo = ROLE_LABELS[member.role] || {
                  label: member.role,
                  color: 'bg-gray-100 dark:bg-slate-800 text-gray-600',
                };
                const name = member.profile?.full_name || 'موظف في المنشأة';

                return (
                  <div
                    key={member.id}
                    className="flex flex-col justify-between gap-3 rounded-2xl border border-gray-100 bg-[var(--app-surface)] p-4 shadow-sm transition-all hover:border-purple-200 dark:border-slate-800 dark:hover:border-purple-900/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-purple-200 bg-purple-100 text-sm font-black text-purple-600 dark:border-purple-800/40 dark:bg-purple-950/50 dark:text-purple-400">
                          {name.slice(0, 2)}
                        </div>
                        <div>
                          <h5 className="text-xs font-extrabold text-gray-900 dark:text-slate-100">
                            {name}
                          </h5>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span
                              className={cn(
                                'rounded-md px-2 py-0.5 text-[10px] font-bold',
                                roleInfo.color
                              )}
                            >
                              {roleInfo.label}
                            </span>
                            <span className="flex items-center gap-1 rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:border-blue-900/30 dark:bg-blue-950/40 dark:text-blue-400">
                              <Building2 size={10} />
                              {member.branch?.name ? `فرع ${member.branch.name}` : 'جميع الفروع'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-gray-50 pt-2.5 dark:border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMemberForPerms(member);
                        }}
                        className="flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-extrabold text-purple-600 shadow-sm transition-colors hover:bg-purple-100 dark:border-purple-800/40 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/50"
                      >
                        <Key size={13} />
                        تخصيص الصلاحيات والفروع
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Invitations & Add New */}
      {activeTab === 'invitations' && (
        <div className="grid grid-cols-1 gap-8 p-5 max-md:gap-4 max-md:p-4 lg:grid-cols-3">
          {/* Invite Form */}
          <div className="space-y-4 lg:col-span-1">
            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700 dark:text-slate-300">
              {t.send_new_invitation || 'إرسال دعوة جديدة'}
            </h4>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <Input
                label={t.email_label || 'البريد الإلكتروني'}
                icon={<Mail />}
                variant="micro"
                {...register('email', { required: true })}
                dir="ltr"
              />

              {/* Role */}
              <div className="space-y-1">
                <label className="px-1 text-[10px] font-bold uppercase text-gray-400">
                  {t.job_role || 'الدور الوظيفي'}
                </label>
                <select
                  {...register('role')}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2 text-[11px] font-bold outline-none dark:border-slate-700 dark:bg-slate-800 max-md:p-2.5"
                >
                  <option value="admin">مسؤول نظام (Admin)</option>
                  <option value="manager">مدير (Manager)</option>
                  <option value="accountant">محاسب (Accountant)</option>
                  <option value="sales">مبيعات (Sales)</option>
                  <option value="viewer">مشاهد (Viewer)</option>
                </select>
              </div>

              {/* Branch Assignment */}
              <div className="space-y-1">
                <label className="flex items-center gap-1 px-1 text-[10px] font-bold uppercase text-gray-400">
                  <GitBranch size={10} />
                  الفرع المخصص
                </label>
                <select
                  {...register('branch_id')}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2 text-[11px] font-bold outline-none dark:border-slate-700 dark:bg-slate-800 max-md:p-2.5"
                >
                  <option value="">-- بدون فرع محدد (إدارة عامة) --</option>
                  {branches
                    ?.filter((b: any) => b.status === 'active')
                    .map((branch: any) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                </select>
                <p className="px-1 text-[10px] text-gray-400">
                  إذا تركته فارغاً، سيرى الموظف بيانات جميع الفروع
                </p>
              </div>

              <Button
                type="submit"
                isLoading={isInviting}
                className="mt-2 w-full rounded-xl py-2.5 text-xs font-bold"
                leftIcon={<Plus size={14} />}
              >
                {t.send_invitation || 'إرسال الدعوة'}
              </Button>
            </form>
          </div>

          {/* Invitations List */}
          <div className="space-y-4 border-t pt-6 dark:border-slate-800 lg:col-span-2 lg:border-r lg:border-t-0 lg:pr-6 lg:pt-0">
            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700 dark:text-slate-300">
              {t.sent_invitations || 'الدعوات المرسلة'}
            </h4>
            <div className="space-y-2">
              {invitations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center text-xs text-gray-400 dark:border-slate-800 dark:bg-slate-950/30">
                  لا توجد دعوات معلقة حالياً.
                </div>
              ) : (
                invitations.map(inv => (
                  <MicroListItem
                    key={inv.id}
                    icon={
                      inv.status === 'pending'
                        ? Clock
                        : inv.status === 'accepted'
                          ? CheckCircle
                          : XCircle
                    }
                    iconColorClass={
                      inv.status === 'pending'
                        ? 'text-amber-500'
                        : inv.status === 'accepted'
                          ? 'text-emerald-500'
                          : 'text-rose-500'
                    }
                    title={inv.email}
                    subtitle={`${t.job_role || 'الدور'}: ${inv.role}${
                      inv.branches?.name ? ` | الفرع: ${inv.branches.name}` : ' | مدير عام'
                    } | إضافة: ${new Date(inv.created_at).toLocaleDateString('ar-SA-u-nu-latn')}`}
                    tags={[
                      {
                        label:
                          inv.status === 'pending'
                            ? t.waiting_for_acceptance || 'بانتظار القبول'
                            : t.accepted || 'مقبولة',
                        color: inv.status === 'pending' ? 'amber' : 'emerald',
                      },
                      ...(inv.branches?.name
                        ? [
                            {
                              label: `📍 ${inv.branches.name}`,
                              color: 'blue' as const,
                            },
                          ]
                        : [
                            {
                              label: '🌐 مدير عام',
                              color: 'slate' as const,
                            },
                          ]),
                    ]}
                    actions={
                      inv.status === 'pending' && (
                        <button
                          onClick={() => {
                            handleRemoveInvitation(inv.id);
                          }}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20"
                        >
                          <Trash2 size={14} />
                        </button>
                      )
                    }
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Permissions & Branch Customization Modal */}
      <EmployeePermissionsModal
        isOpen={Boolean(selectedMemberForPerms)}
        onClose={() => {
          setSelectedMemberForPerms(null);
        }}
        member={selectedMemberForPerms}
      />
    </div>
  );
};

export default TeamManager;
