import { useState, useMemo, useCallback } from 'react';
import type { ChatMessage } from '../types';

export const useChatSearch = (messages: ChatMessage[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  const matchingMessageIds = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];

    return messages
      .filter(m => {
        if (m.content && m.content.toLowerCase().includes(term)) return true;
        if (m.sender_name?.toLowerCase().includes(term)) return true;
        if (m.metadata && typeof (m.metadata as any).title === 'string') {
          if ((m.metadata as any).title.toLowerCase().includes(term)) return true;
        }
        return false;
      })
      .map(m => m.id);
  }, [messages, searchTerm]);

  const totalMatches = matchingMessageIds.length;

  const currentMatchId =
    totalMatches > 0 && activeMatchIndex < totalMatches
      ? matchingMessageIds[activeMatchIndex]
      : null;

  const goToNext = useCallback(() => {
    if (totalMatches === 0) return;
    setActiveMatchIndex(prev => (prev + 1) % totalMatches);
  }, [totalMatches]);

  const goToPrev = useCallback(() => {
    if (totalMatches === 0) return;
    setActiveMatchIndex(prev => (prev - 1 + totalMatches) % totalMatches);
  }, [totalMatches]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setActiveMatchIndex(0);
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    matchingMessageIds,
    currentMatchId,
    activeMatchIndex: totalMatches > 0 ? activeMatchIndex + 1 : 0,
    totalMatches,
    goToNext,
    goToPrev,
    clearSearch,
  };
};
