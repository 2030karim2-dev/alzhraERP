import React, { useState, useEffect } from 'react';
import { X, User, MessageSquare, Plus, Search, Loader2 } from 'lucide-react';
import { chatService } from '../services/chatService';
import { useAuthStore } from '../../auth/store';
import { useChatStore } from '../stores/chatStore';
import { supabase } from '../../../lib/supabaseClient';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const NewChatModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const { setActiveChannel, fetchChannels } = useChatStore();

  const [mode, setMode] = useState<'direct' | 'group'>('direct');
  const [search, setSearch] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Group creation state
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupType, setGroupType] = useState<'branch' | 'topic'>('topic');
  const [selectedBranchId, setSelectedBranchId] = useState('');

  const companyId = user?.company_id;

  useEffect(() => {
    if (!isOpen || !companyId) return;

    setIsLoading(true);
    Promise.all([
      chatService.getCompanyEmployees(companyId),
      supabase.from('branches').select('id, name').eq('company_id', companyId),
    ])
      .then(([emps, { data: brs }]) => {
        // Filter out current user from direct chat candidates
        setEmployees(emps.filter((e) => e.id !== user?.id));
        if (brs) setBranches(brs);
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, companyId, user?.id]);

  if (!isOpen) return null;

  const filteredEmployees = employees.filter(
    (e) =>
      e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.branch_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.role?.toLowerCase().includes(search.toLowerCase())
  );

  const handleStartDirect = async (targetUserId: string) => {
    if (!companyId) return;
    setIsSubmitting(true);
    try {
      const channelId = await chatService.getOrCreateDirectChannel(companyId, targetUserId);
      await fetchChannels(companyId, user?.id || '');
      setActiveChannel(channelId);
      onClose();
    } catch (err) {
      // Error handled
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !groupName.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const { data: newChannel, error } = await (supabase as any)
        .from('chat_channels')
        .insert({
          company_id: companyId,
          type: groupType,
          name: groupName.trim(),
          description: groupDescription.trim() || null,
          branch_id: groupType === 'branch' && selectedBranchId ? selectedBranchId : null,
          is_private: false,
          created_by: user.id,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Join creator to the channel
      await (supabase as any).from('chat_channel_members').insert({
        channel_id: newChannel.id,
        user_id: user.id,
        role: 'owner',
      });

      await fetchChannels(companyId, user.id);
      setActiveChannel(newChannel.id);
      onClose();
    } catch (err) {
      // Error handled
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex h-[520px] w-full max-w-md flex-col rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--app-border)] p-4">
          <h3 className="text-base font-bold text-[var(--app-text)]">محادثة جديدة</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-[var(--app-border)] bg-[var(--app-bg)]/50 p-2 gap-1.5">
          <button
            onClick={() => setMode('direct')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
              mode === 'direct'
                ? 'bg-[var(--app-surface)] text-[var(--accent)] shadow-sm'
                : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]'
            }`}
          >
            <User size={14} /> محادثة مع موظف
          </button>
          <button
            onClick={() => setMode('group')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
              mode === 'group'
                ? 'bg-[var(--app-surface)] text-[var(--accent)] shadow-sm'
                : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]'
            }`}
          >
            <Plus size={14} /> إنشاء قناة أو غرفة فرع
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {mode === 'direct' ? (
            <div className="space-y-3">
              <div className="relative">
                <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--app-text-secondary)]" />
                <input
                  type="text"
                  placeholder="ابحث باسم الموظف، الفرع، أو الدور..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] py-2 pe-3 ps-9 text-xs text-[var(--app-text)] outline-none focus:border-[var(--accent)]"
                />
              </div>

              {isLoading && (
                <div className="flex justify-center py-10">
                  <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
                </div>
              )}

              {!isLoading && filteredEmployees.length === 0 && (
                <div className="py-10 text-center text-xs text-[var(--app-text-secondary)]">
                  لم يتم العثور على موظفين
                </div>
              )}

              <div className="space-y-1.5">
                {filteredEmployees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => handleStartDirect(emp.id)}
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-between rounded-xl border border-[var(--app-border)] p-2.5 text-start transition-all hover:border-[var(--accent)] hover:bg-[var(--app-surface-hover)] disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2.5">
                      {emp.avatar_url ? (
                        <img
                          src={emp.avatar_url}
                          alt={emp.full_name}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)]/10 font-bold text-[var(--accent)] text-xs">
                          {emp.full_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <strong className="block text-xs text-[var(--app-text)]">{emp.full_name}</strong>
                        <span className="text-[10px] text-[var(--app-text-secondary)]">
                          {emp.role} {emp.branch_name ? `• ${emp.branch_name}` : ''}
                        </span>
                      </div>
                    </div>
                    <MessageSquare size={14} className="text-[var(--app-text-secondary)]" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateGroup} className="space-y-3.5 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-[var(--app-text-secondary)]">نوع القناة:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGroupType('topic')}
                    className={`rounded-xl border p-2 text-center font-bold transition-all ${
                      groupType === 'topic'
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                        : 'border-[var(--app-border)] bg-[var(--app-bg)] text-[var(--app-text-secondary)]'
                    }`}
                  >
                    موضوع تشغيلي
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupType('branch')}
                    className={`rounded-xl border p-2 text-center font-bold transition-all ${
                      groupType === 'branch'
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                        : 'border-[var(--app-border)] bg-[var(--app-bg)] text-[var(--app-text-secondary)]'
                    }`}
                  >
                    قناة خاصة بفرع
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-[var(--app-text-secondary)]">اسم القناة / الغرفة:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: طلبات التحويل والمناقلة السريعة"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] p-2.5 outline-none focus:border-[var(--accent)]"
                />
              </div>

              {groupType === 'branch' && (
                <div>
                  <label className="mb-1 block font-semibold text-[var(--app-text-secondary)]">الفرع المرتبط:</label>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] p-2.5 outline-none"
                  >
                    <option value="">-- اختر الفرع --</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1 block font-semibold text-[var(--app-text-secondary)]">الوصف (اختياري):</label>
                <textarea
                  rows={2}
                  placeholder="اكتب وصفاً موجزاً لغرض القناة..."
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] p-2.5 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !groupName.trim()}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-2.5 font-bold text-white shadow-md transition-all hover:opacity-90 disabled:opacity-40"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                إنشاء القناة الآن
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
