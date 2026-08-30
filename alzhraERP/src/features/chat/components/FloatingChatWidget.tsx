import React, { useEffect, useState } from 'react';
import {
  MessageSquare,
  X,
  Minus,
  Maximize2,
  ChevronLeft,
  Minimize2,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../../auth/store';
import { useChatRealtime } from '../hooks/useChatRealtime';
import { ConversationList } from './ConversationList';
import { ConversationView } from './ConversationView';

export const FloatingChatWidget: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    isFloatingOpen,
    setFloatingOpen,
    isFloatingMinimized,
    toggleFloatingMinimized,
    activeChannelId,
    setActiveChannel,
    fetchChannels,
    getTotalUnreadCount,
  } = useChatStore();

  const [isExpanded, setIsExpanded] = useState(false);

  // Initialize Realtime subscription
  useChatRealtime();

  useEffect(() => {
    if (user?.company_id && user?.id) {
      fetchChannels(user.company_id, user.id);
    }
  }, [user?.company_id, user?.id, fetchChannels]);

  const totalUnread = getTotalUnreadCount();

  const handleOpenHub = () => {
    setFloatingOpen(false);
    navigate('/chat');
  };

  // If chat is not opened, render floating launcher bubble
  if (!isFloatingOpen) {
    return (
      <div className="fixed bottom-[calc(4.5rem_+_env(safe-area-inset-bottom))] md:bottom-5 end-4 md:end-5 z-40">
        <button
          onClick={() => { setFloatingOpen(true); }}
          className="relative flex h-12 w-12 md:h-13 md:w-13 items-center justify-center rounded-2xl bg-[var(--accent)] text-white shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-2xl"
          title="محادثات الفروع والموظفين"
        >
          <MessageSquare size={22} className="md:w-6 md:h-6" />
          {totalUnread > 0 && (
            <span className="absolute -top-1.5 -end-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-md animate-pulse">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </button>
      </div>
    );
  }

  // Minimized state
  if (isFloatingMinimized) {
    return (
      <div className="fixed bottom-[calc(4.5rem_+_env(safe-area-inset-bottom))] md:bottom-5 end-4 md:end-5 z-40 flex items-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-2 shadow-xl">
        <button
          onClick={toggleFloatingMinimized}
          className="flex items-center gap-2 px-2 text-xs font-bold text-[var(--app-text)] hover:text-[var(--accent)]"
        >
          <MessageSquare size={18} className="text-[var(--accent)]" />
          <span>المحادثات</span>
          {totalUnread > 0 && (
            <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
              {totalUnread}
            </span>
          )}
        </button>
        <button
          onClick={() => { setFloatingOpen(false); }}
          className="flex h-6 w-6 items-center justify-center rounded-lg text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  // Expanded Floating Window
  return (
    <div
      className={`fixed bottom-[calc(4.5rem_+_env(safe-area-inset-bottom))] md:bottom-5 end-3 md:end-5 z-40 flex flex-col overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-2xl transition-all duration-300 ${
        isExpanded
          ? 'h-[75vh] md:h-[85vh] w-[92vw] sm:w-[680px]'
          : 'h-[480px] md:h-[520px] w-[92vw] sm:w-[390px]'
      }`}
    >
      {/* Floating Header */}
      <div className="flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2">
        <div className="flex items-center gap-2">
          {activeChannelId && (
            <button
              onClick={() => { setActiveChannel(null); }}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]"
              title="الرجوع للقائمة"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          <span className="text-xs font-bold text-[var(--app-text)]">
            محادثات وتواصل الفروع
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleOpenHub}
            title="فتح في صفحة كاملة"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]"
          >
            <ExternalLink size={14} />
          </button>
          <button
            onClick={() => { setIsExpanded(!isExpanded); }}
            title={isExpanded ? 'تصغير' : 'توسيع'}
            className="hidden sm:flex h-7 w-7 items-center justify-center rounded-lg text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]"
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            onClick={toggleFloatingMinimized}
            title="إنزال"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]"
          >
            <Minus size={14} />
          </button>
          <button
            onClick={() => { setFloatingOpen(false); }}
            title="إغلاق"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)] hover:text-rose-500"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Floating Content Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* If expanded on desktop, show two panes; otherwise show active view */}
        {isExpanded ? (
          <div className="flex w-full h-full">
            <div className="w-64 border-e border-[var(--app-border)]">
              <ConversationList />
            </div>
            <div className="flex-1">
              <ConversationView />
            </div>
          </div>
        ) : activeChannelId ? (
          <ConversationView onBack={() => { setActiveChannel(null); }} />
        ) : (
          <ConversationList />
        )}
      </div>
    </div>
  );
};
