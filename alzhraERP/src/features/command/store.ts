
import { create } from 'zustand';
import { LucideIcon } from 'lucide-react';

export interface CommandAction {
  id: string;
  title: string;
  section: 'Navigation' | 'Actions' | 'Theme';
  onSelect: () => void;
  icon: LucideIcon;
  keywords?: string;
}

interface CommandPaletteState {
  isOpen: boolean;
  actions: CommandAction[];
  openPalette: () => void;
  closePalette: () => void;
  registerActions: (actions: CommandAction[]) => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>((set, _get) => ({
  isOpen: false,
  actions: [],
  openPalette: () => set({ isOpen: true }),
  closePalette: () => set({ isOpen: false }),
  registerActions: (newActions) => {
    set(state => {
      // Avoid duplicates by checking ID
      const existingIds = new Set(state.actions.map(a => a.id));
      const filteredNewActions = newActions.filter(a => !existingIds.has(a.id));
      return { actions: [...state.actions, ...filteredNewActions] };
    });
  }
}));
