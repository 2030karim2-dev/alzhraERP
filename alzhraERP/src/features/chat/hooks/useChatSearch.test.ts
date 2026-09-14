import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatSearch } from './useChatSearch';
import type { ChatMessage } from '../types';

const mockMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    channel_id: 'ch-1',
    sender_id: 'user-1',
    sender_name: 'أحمد',
    message_type: 'text',
    content: 'مرحباً، هل يتوفر فحمات فرامل تويوتا كورولا؟',
    metadata: {},
    created_at: '2026-09-14T10:00:00Z',
  },
  {
    id: 'msg-2',
    channel_id: 'ch-1',
    sender_id: 'user-2',
    sender_name: 'خالد',
    message_type: 'text',
    content: 'نعم متوفرة في المستودع الرئيسي بسعر 120 ريال',
    metadata: {},
    created_at: '2026-09-14T10:05:00Z',
  },
  {
    id: 'msg-3',
    channel_id: 'ch-1',
    sender_id: 'user-1',
    sender_name: 'أحمد',
    message_type: 'audio',
    content: 'تسجيل صوتي',
    metadata: { duration: 15 },
    created_at: '2026-09-14T10:06:00Z',
  },
];

describe('useChatSearch Hook', () => {
  it('يبحث في محتوى الرسائل ويجد المطابقات بدقة', () => {
    const { result } = renderHook(() => useChatSearch(mockMessages));

    expect(result.current.totalMatches).toBe(0);

    act(() => {
      result.current.setSearchTerm('فرامل');
    });

    expect(result.current.totalMatches).toBe(1);
    expect(result.current.matchingMessageIds).toEqual(['msg-1']);
    expect(result.current.currentMatchId).toBe('msg-1');
  });

  it('يبحث في اسم المرسل إذا تطابق', () => {
    const { result } = renderHook(() => useChatSearch(mockMessages));

    act(() => {
      result.current.setSearchTerm('خالد');
    });

    expect(result.current.totalMatches).toBe(1);
    expect(result.current.matchingMessageIds).toEqual(['msg-2']);
  });

  it('يتنقل بين نتائج البحث بسلاسة (التالي والسابق)', () => {
    const { result } = renderHook(() => useChatSearch(mockMessages));

    act(() => {
      result.current.setSearchTerm('أحمد');
    });

    expect(result.current.totalMatches).toBe(2);
    expect(result.current.activeMatchIndex).toBe(1);
    expect(result.current.currentMatchId).toBe('msg-1');

    act(() => {
      result.current.goToNext();
    });

    expect(result.current.activeMatchIndex).toBe(2);
    expect(result.current.currentMatchId).toBe('msg-3');

    act(() => {
      result.current.goToPrev();
    });

    expect(result.current.activeMatchIndex).toBe(1);
    expect(result.current.currentMatchId).toBe('msg-1');
  });

  it('يمسح البحث ويعيد المؤشرات إلى الصفر', () => {
    const { result } = renderHook(() => useChatSearch(mockMessages));

    act(() => {
      result.current.setSearchTerm('فرامل');
    });
    expect(result.current.totalMatches).toBe(1);

    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.searchTerm).toBe('');
    expect(result.current.totalMatches).toBe(0);
    expect(result.current.currentMatchId).toBeNull();
  });
});
