import { create } from 'zustand';

export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected';

interface ConnectionState {
  isUnstable: boolean;
  lastTimeoutAt: number | null;
  consecutiveFailures: number;

  /** Live-sync (Supabase Realtime) channel health */
  realtimeStatus: RealtimeStatus;
  realtimeLastEventAt: number | null;

  // Actions
  reportTimeout: () => void;
  reportSuccess: () => void;
  reportFailure: () => void;
  setUnstable: (unstable: boolean) => void;
  setRealtimeStatus: (status: RealtimeStatus) => void;
  reportRealtimeEvent: () => void;
}

export const useConnectionStore = create<ConnectionState>(set => ({
  isUnstable: false,
  lastTimeoutAt: null,
  consecutiveFailures: 0,
  realtimeStatus: 'connecting',
  realtimeLastEventAt: null,

  reportTimeout: () => {
    set(state => {
      const now = Date.now();
      return {
        isUnstable: true,
        lastTimeoutAt: now,
        consecutiveFailures: state.consecutiveFailures + 1,
      };
    });
  },

  reportSuccess: () => {
    set(state => {
      if (!state.isUnstable && state.consecutiveFailures === 0) return state;
      return {
        isUnstable: false,
        consecutiveFailures: 0,
      };
    });
  },

  reportFailure: () => {
    set(state => ({
      consecutiveFailures: state.consecutiveFailures + 1,
      isUnstable: state.consecutiveFailures + 1 >= 3,
    }));
  },

  setUnstable: isUnstable => {
    set({ isUnstable });
  },

  setRealtimeStatus: realtimeStatus => {
    set({ realtimeStatus });
  },

  reportRealtimeEvent: () => {
    set({ realtimeLastEventAt: Date.now() });
  },
}));
