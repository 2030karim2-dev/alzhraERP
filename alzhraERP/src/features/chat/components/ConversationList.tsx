import React, { useState } from 'react';
import {
  Search,
  Plus,
  Building2,
  User,
  Hash,
  Layers,
  MessageSquare,
} from 'lucide-react';
import { useChatStore } from '../stores/chatStore';
import { NewChatModal } from './NewChatModal';
import type { ChannelType } from '../types';

interface Props {
  onSelectChannel?: () => void;
}

export const ConversationList: React.FC<Props> = ({ onSelectChannel }) => {
  const {
    channels,
    activeChannelId,
    setActiveChannel,
    activeFilter,
    setActiveFilter,
    searchQuery,
    setSearchQuery,
    presences,
    isLoadingChannels,
  } = useChatStore();

  const [isNewChatOpen, setIsNewChatOpen] = useState(false);

  // Filter channels according to tab and search query
  const filteredChannels = channels.filter((ch) => {
    // Tab filter
    if (activeFilter === 'branch' && ch.type !== 'branch') return false;
    if (activeFilter === 'direct' && ch.type !== 'direct') return false;
    if (activeFilter === 'topic' && ch.type !== 'topic' && ch.type !== 'department') return false;
    if (activeFilter === 'contextual' && ch.type !== 'contextual') return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = ch.name.toLowerCase().includes(q);
      const matchLastMsg = ch.last_message?.content.toLowerCase().includes(q);
      const matchBranch = ch.branch_name?.toLowerCase().includes(q);
      return matchName || matchLastMsg || matchBranch;
    }

    return true;
  });

  const getChannelIcon = (type: ChannelType) => {
    switch (type) {
      case 'branch':
        return <Building2 size={16} className="text-amber-500" />;
      case 'direct':
        return <User size={16} className="text-blue-500" />;
      case 'contextual':
        return <Layers size={16} className="text-indigo-500" />;
      default:
        return <Hash size={16} className="text-emerald-500" />;
    }
  };

  return (
    <div className="flex h-full flex-col border-e border-[var(--app-border)] bg-[var(--app-surface)]">
      {/* Header & Search */}
      <div className="border-b border-[var(--app-border)] p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={20} className="text-[var(--accent)]" />
            <h2 className="text-base font-bold text-[var(--app-text)]">المحادثات والتواصل</h2>
          </div>
          <button
            onClick={() => { setIsNewChatOpen(true); }}
            title="محادثة جديدة"
            className="flex h-8 items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 text-xs font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">جديد</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--app-text-secondary)]" />
          <input
            type="text"
            placeholder="بحث في القنوات والرسائل..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); }}
            className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] py-1.5 pe-3 ps-8 text-xs text-[var(--app-text)] outline-none focus:border-[var(--accent)]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1 overflow-x-auto pb-1 text-[11px] font-semibold scrollbar-none">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'branch', label: 'الفروع' },
            { id: 'direct', label: 'الخاص' },
            { id: 'topic', label: 'المواضيع' },
            { id: 'contextual', label: 'العمليات' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveFilter(tab.id as any); }}
              className={`rounded-lg px-2.5 py-1 whitespace-nowrap transition-all ${
                activeFilter === tab.id
                  ? 'bg-[var(--accent)] text-white shadow-xs'
                  : 'bg-[var(--app-bg)] text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
        {isLoadingChannels && channels.length === 0 && (
          <div className="py-10 text-center text-xs text-[var(--app-text-secondary)]">
            جاري تحميل المحادثات...
          </div>
        )}

        {!isLoadingChannels && filteredChannels.length === 0 && (
          <div className="py-10 text-center text-xs text-[var(--app-text-secondary)]">
            لا توجد محادثات مطابقة
          </div>
        )}

        {filteredChannels.map((channel) => {
          const isSelected = activeChannelId === channel.id;
          const directUserId = channel.direct_user?.id;
          const presence = directUserId ? presences[directUserId] : null;
          const isOnline = presence?.status === 'online';

          const formattedTime = channel.last_message
            ? new Date(channel.last_message.created_at).toLocaleTimeString('ar-SA', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : '';

          return (
            <button
              key={channel.id}
              onClick={() => {
                setActiveChannel(channel.id);
                onSelectChannel?.();
              }}
              className={`group flex w-full items-center gap-3 rounded-xl p-2.5 text-start transition-all ${
                isSelected
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'hover:bg-[var(--app-surface-hover)] text-[var(--app-text)]'
              }`}
            >
              {/* Channel / User Avatar */}
              <div className="relative flex-shrink-0">
                {channel.type === 'direct' && channel.direct_user?.avatar_url ? (
                  <img
                    src={channel.direct_user.avatar_url}
                    alt={channel.name}
                    className="h-10 w-10 rounded-full object-cover border border-[var(--app-border)]"
                  />
                ) : (
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                      isSelected
                        ? 'bg-white/20 border-white/30 text-white'
                        : 'bg-[var(--app-bg)] border-[var(--app-border)]'
                    }`}
                  >
                    {getChannelIcon(channel.type)}
                  </div>
                )}

                {/* Online Indicator for Direct */}
                {channel.type === 'direct' && (
                  <span
                    className={`absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full border-2 ${
                      isSelected ? 'border-[var(--accent)]' : 'border-[var(--app-surface)]'
                    } ${isOnline ? 'bg-emerald-500' : 'bg-zinc-400'}`}
                  />
                )}
              </div>

              {/* Title & Preview */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-xs font-bold">{channel.name}</span>
                  {formattedTime && (
                    <span
                      className={`text-[10px] ${
                        isSelected ? 'text-white/80' : 'text-[var(--app-text-secondary)]'
                      }`}
                    >
                      {formattedTime}
                    </span>
                  )}
                </div>

                <div className="mt-0.5 flex items-center justify-between gap-1">
                  <p
                    className={`truncate text-[11px] ${
                      isSelected ? 'text-white/80' : 'text-[var(--app-text-secondary)]'
                    }`}
                  >
                    {channel.last_message
                      ? channel.last_message.content || 'بطاقة تفاعلية / مرفق'
                      : channel.description || 'محادثة جديدة'}
                  </p>

                  {/* Unread Badge */}
                  {channel.unread_count ? (
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs">
                      {channel.unread_count}
                    </span>
                  ) : null}
                </div>

                {/* Branch tag */}
                {channel.branch_name && channel.type !== 'direct' && (
                  <span
                    className={`mt-1 inline-block rounded px-1.5 py-0.2 text-[10px] font-medium ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-[var(--app-bg)] text-[var(--app-text-secondary)]'
                    }`}
                  >
                    {channel.branch_name}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* New Chat Modal */}
      <NewChatModal isOpen={isNewChatOpen} onClose={() => { setIsNewChatOpen(false); }} />
    </div>
  );
};
