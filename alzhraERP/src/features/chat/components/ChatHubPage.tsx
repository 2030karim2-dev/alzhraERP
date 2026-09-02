import React, { useEffect, useState } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../../auth/store';
import { useChatRealtime } from '../hooks/useChatRealtime';
import { ConversationList } from './ConversationList';
import { ConversationView } from './ConversationView';

export const ChatHubPage: React.FC = () => {
  const { user } = useAuthStore();
  const { fetchChannels, activeChannelId, setActiveChannel } = useChatStore();
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  // Initialize Realtime subscription
  useChatRealtime();

  useEffect(() => {
    if (user?.company_id && user?.id) {
      fetchChannels(user.company_id, user.id);
    }
  }, [user?.company_id, user?.id, fetchChannels]);

  useEffect(() => {
    if (activeChannelId) {
      setMobileView('chat');
    }
  }, [activeChannelId]);

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-[var(--app-bg)]">
      {/* Sidebar List (Desktop: always visible, Mobile: toggled) */}
      <div
        className={`w-full lg:block lg:w-80 lg:flex-shrink-0 ${
          mobileView === 'list' ? 'block' : 'hidden lg:block'
        }`}
      >
        <ConversationList
          onSelectChannel={() => {
            setMobileView('chat');
          }}
        />
      </div>

      {/* Main Chat Area */}
      <div
        className={`flex-1 ${
          mobileView === 'chat' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'
        }`}
      >
        <ConversationView
          onBack={() => {
            setMobileView('list');
            setActiveChannel(null);
          }}
        />
      </div>
    </div>
  );
};
