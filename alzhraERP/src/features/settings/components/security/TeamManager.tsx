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
import {
  useCompanyMembers,
  CompanyMember,
} from '../../hooks/useUserPermissions';
import EmployeePermissionsModal from './EmployeePermissionsModal';
import { cn } from '../../../../core/utils';

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  owner: { label: 'مالك المنشأة (Owner)', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
  admin: { label: 'مدير نظام (Admin)', color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' },
  manager: { label: 'مدير (Manager)', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  accountant: { label: 'محاسب (Accountant)', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
  sales: { label: 'مبيعات (Sales)', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' },
  viewer: { label: 'مشاهد (Viewer)', color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' },
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
    <div className="bg-[var(--app-surface)] rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in duration-500">
      {/* Header */}
      <div className="p-5 max-md:p-4 border-b dark:border-slate-800 flex flex-wrap justify-between items-center gap-4 bg-gray-50/50 dark:bg-slate-950/50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-600 text-white rounded-2xl shadow-lg shadow-purple-500/20">
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
        <div className="flex items-center gap-1.5 p-1 bg-gray-200/60 dark:bg-slate-800 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5',
              activeTab === 'members'
                ? 'bg-[var(--app-surface)] text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900'
            )}
          >
            <UserCheck size={14} />
            أعضاء الفريق ({members.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('invitations')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5',
              activeTab === 'invitations'
                ? 'bg-[var(--app-surface)] text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900'
            )}
          >
            <Mail size={14} />
            الدعوات ({invitations.length})
          </button>
        </div>
      </div>

      {/* TAB 1: Active Team Members */}
      {activeTab === 'members' && (
        <div className="p-5 max-md:p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-gray-700 dark:text-slate-300 flex items-center gap-2">
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
            <div className="py-12 text-center text-xs font-bold text-gray-400 bg-gray-50 dark:bg-slate-950/30 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800">
              لا يوجد أعضاء مسجلين حالياً. يمكنك إرسال دعوة للانضمام من تبويب الدعوات.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {members.map((member) => {
                const roleInfo = ROLE_LABELS[member.role] || {
                  label: member.role,
                  color: 'bg-gray-100 dark:bg-slate-800 text-gray-600',
                };
                const name = member.profile?.full_name || 'موظف في المنشأة';

                return (
                  <div
                    key={member.id}
                    className="p-4 rounded-2xl border border-gray-100 dark:border-slate-800 bg-[var(--app-surface)] hover:border-purple-200 dark:hover:border-purple-900/50 transition-all shadow-sm flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 font-black text-sm flex items-center justify-center border border-purple-200 dark:border-purple-800/40">
                          {name.slice(0, 2)}
                        </div>
                        <div>
                          <h5 className="text-xs font-extrabold text-gray-900 dark:text-slate-100">
                            {name}
                          </h5>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span
                              className={cn(
                                'text-[10px] font-bold px-2 py-0.5 rounded-md',
                                roleInfo.color
                              )}
                            >
                              {roleInfo.label}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 flex items-center gap-1">
                              <Building2 size={10} />
                              {member.branch?.name ? `فرع ${member.branch.name}` : 'جميع الفروع'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-gray-50 dark:border-slate-800/80 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedMemberForPerms(member)}
                        className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800/40 transition-colors flex items-center gap-1.5 shadow-sm"
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
        <div className="p-5 max-md:p-4 grid grid-cols-1 lg:grid-cols-3 gap-8 max-md:gap-4">
          {/* Invite Form */}
          <div className="lg:col-span-1 space-y-4">
            <h4 className="text-[11px] font-extrabold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
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
                <label className="text-[10px] font-bold text-gray-400 uppercase px-1">
                  {t.job_role || 'الدور الوظيفي'}
                </label>
                <select
                  {...register('role')}
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-2 max-md:p-2.5 text-[11px] font-bold outline-none"
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
                <label className="text-[10px] font-bold text-gray-400 uppercase px-1 flex items-center gap-1">
                  <GitBranch size={10} />
                  الفرع المخصص
                </label>
                <select
                  {...register('branch_id')}
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-2 max-md:p-2.5 text-[11px] font-bold outline-none"
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
                <p className="text-[10px] text-gray-400 px-1">
                  إذا تركته فارغاً، سيرى الموظف بيانات جميع الفروع
                </p>
              </div>

              <Button
                type="submit"
                isLoading={isInviting}
                className="w-full rounded-xl mt-2 py-2.5 text-xs font-bold"
                leftIcon={<Plus size={14} />}
              >
                {t.send_invitation || 'إرسال الدعوة'}
              </Button>
            </form>
          </div>

          {/* Invitations List */}
          <div className="lg:col-span-2 space-y-4 border-t lg:border-t-0 lg:border-r dark:border-slate-800 pt-6 lg:pt-0 lg:pr-6">
            <h4 className="text-[11px] font-extrabold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
              {t.sent_invitations || 'الدعوات المرسلة'}
            </h4>
            <div className="space-y-2">
              {invitations.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400 bg-gray-50/50 dark:bg-slate-950/30 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800">
                  لا توجد دعوات معلقة حالياً.
                </div>
              ) : (
                invitations.map((inv) => (
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
                      inv.branches?.name
                        ? ` | الفرع: ${inv.branches.name}`
                        : ' | مدير عام'
                    } | إضافة: ${new Date(inv.created_at).toLocaleDateString(
                      'ar-SA-u-nu-latn'
                    )}`}
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
                          onClick={() => handleRemoveInvitation(inv.id)}
                          className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
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
        onClose={() => setSelectedMemberForPerms(null)}
        member={selectedMemberForPerms}
      />
    </div>
  );
};

export default TeamManager;
