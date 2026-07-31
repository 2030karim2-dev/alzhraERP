import { create } from 'zustand';

interface ConnectionState {
  isUnstable: boolean;
  lastTimeoutAt: number | null;
  consecutiveFailures: number;
  
  // Actions
  reportTimeout: () => void;
  reportSuccess: () => void;
  reportFailure: () => void;
  setUnstable: (unstable: boolean) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  isUnstable: false,
  lastTimeoutAt: null,
  consecutiveFailures: 0,

  reportTimeout: () => set((state) => {
    const now = Date.now();
    return {
      isUnstable: true,
      lastTimeoutAt: now,
      consecutiveFailures: state.consecutiveFailures + 1,
    };
  }),

  reportSuccess: () => set({
    isUnstable: false,
    consecutiveFailures: 0,
  }),

  reportFailure: () => set((state) => ({
    consecutiveFailures: state.consecutiveFailures + 1,
    isUnstable: state.consecutiveFailures + 1 >= 3,
  })),

  setUnstable: (isUnstable) => set({ isUnstable }),
}));
