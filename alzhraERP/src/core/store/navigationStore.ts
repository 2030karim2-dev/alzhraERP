/**
 * Navigation Store — Persists user navigation preferences.
 *
 * Allows reordering and toggling visibility of navigation items.
 * Stores favorites and custom ordering in localStorage.
 *
 * @module core/store/navigationStore
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: string;
}

interface NavigationState {
  /** Custom order of nav item IDs (first = top/left) */
  order: string[];
  /** Set of hidden nav item IDs */
  hidden: Set<string>;
  /** Favorite item IDs (always shown) */
  favorites: string[];

  /** Actions */
  reorder: (newOrder: string[]) => void;
  toggleHidden: (id: string) => void;
  toggleFavorite: (id: string) => void;
  isVisible: (id: string) => boolean;
  isFavorite: (id: string) => boolean;
  getOrderedVisible: (allItems: NavItem[]) => NavItem[];
}

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set, get) => ({
      order: [],
      hidden: new Set<string>(),
      favorites: [],

      reorder: (newOrder: string[]): void => {
        set({ order: newOrder });
      },

      toggleHidden: (id: string): void => {
        const newHidden = new Set(get().hidden);
        if (newHidden.has(id)) {
          newHidden.delete(id);
        } else {
          newHidden.add(id);
        }
        set({ hidden: newHidden });
      },

      toggleFavorite: (id: string): void => {
        const favorites = [...get().favorites];
        const idx = favorites.indexOf(id);
        if (idx >= 0) {
          favorites.splice(idx, 1);
        } else {
          favorites.push(id);
        }
        set({ favorites });
      },

      isVisible: (id: string): boolean => !get().hidden.has(id),

      isFavorite: (id: string): boolean => get().favorites.includes(id),

      getOrderedVisible: (allItems: NavItem[]): NavItem[] => {
        const { order, hidden, favorites } = get();
        const visible = allItems.filter(item => !hidden.has(item.id));

        // Sort: favorites first, then by custom order, then by original position
        return visible.sort((a, b) => {
          const aFav = favorites.includes(a.id) ? -1 : 0;
          const bFav = favorites.includes(b.id) ? -1 : 0;
          if (aFav !== bFav) return aFav - bFav;

          const aOrder = order.indexOf(a.id);
          const bOrder = order.indexOf(b.id);
          if (aOrder >= 0 && bOrder >= 0) return aOrder - bOrder;
          if (aOrder >= 0) return -1;
          if (bOrder >= 0) return 1;
          return 0;
        });
      },
    }),
    {
      name: 'alzhra-navigation',
      partialize: state => ({
        order: state.order,
        hidden: Array.from(state.hidden),
        favorites: state.favorites,
      }),
      merge: (persisted: unknown, current: NavigationState): NavigationState => {
        const p = persisted as Record<string, unknown> | null;
        return {
          ...current,
          order: (p?.order as string[]) || [],
          hidden: new Set<string>((p?.hidden as string[]) || []),
          favorites: (p?.favorites as string[]) || [],
        };
      },
    }
  )
);
