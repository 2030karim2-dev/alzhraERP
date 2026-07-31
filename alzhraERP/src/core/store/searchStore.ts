import { create } from 'zustand';

interface SearchState {
  pageSearchValue: string;
  pageSearchPlaceholder: string;
  onPageSearchChange: ((val: string) => void) | null;
  setPageSearch: (config: { value: string; placeholder?: string; onChange: (val: string) => void } | null) => void;
  clearPageSearch: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  pageSearchValue: '',
  pageSearchPlaceholder: '',
  onPageSearchChange: null,
  setPageSearch: (config) => set({
    pageSearchValue: config?.value ?? '',
    pageSearchPlaceholder: config?.placeholder ?? '',
    onPageSearchChange: config?.onChange ?? null,
  }),
  clearPageSearch: () => set({
    pageSearchValue: '',
    pageSearchPlaceholder: '',
    onPageSearchChange: null,
  }),
}));
