import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBreakpoint } from '../../../lib/hooks/useBreakpoint';
import type { Product } from '../types';

interface InventoryViewState {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  activeView: string;
  setActiveView: (view: string) => void;
  displayMode: 'table' | 'grid';
  setDisplayMode: (mode: 'table' | 'grid') => void;
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
  editingProduct: Product | null;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  handleEdit: (product: Product) => void;
  handleAdd: () => void;
  handleCloseModal: () => void;
}

/** Syncs the active tab + search term with the URL query string. */
const useUrlSyncedView = (): {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  activeView: string;
  setActiveView: (view: string) => void;
} => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTermState] = useState(searchParams.get('search') ?? '');
  const [activeView, setActiveViewState] = useState(searchParams.get('tab') ?? 'products');

  // Synchronize activeView with URL tab parameter when searchParams change externally
  useEffect(() => {
    const currentTab = searchParams.get('tab') ?? 'products';
    setActiveViewState(prev => (prev !== currentTab ? currentTab : prev));
  }, [searchParams]);

  const setActiveView = (view: string): void => {
    const isChangingTab = view !== activeView;
    setActiveViewState(view);
    const nextParams = new URLSearchParams(searchParams);
    if (view !== '' && view !== 'products') {
      nextParams.set('tab', view);
    } else {
      nextParams.delete('tab');
    }
    // Clear search term when switching tabs so filters from previous tab do not hide contents
    if (isChangingTab) {
      setSearchTermState('');
      nextParams.delete('search');
    }
    setSearchParams(nextParams, { replace: true });
  };

  const setSearchTerm = (term: string): void => {
    setSearchTermState(term);
    const nextParams = new URLSearchParams(searchParams);
    if (term !== '') {
      nextParams.set('search', term);
    } else {
      nextParams.delete('search');
    }
    setSearchParams(nextParams, { replace: true });
  };

  return { searchTerm, setSearchTerm, activeView, setActiveView };
};

export const useInventoryView = (): InventoryViewState => {
  const isDesktop = useBreakpoint('md');
  const { searchTerm, setSearchTerm, activeView, setActiveView } = useUrlSyncedView();
  const [displayMode, setDisplayMode] = useState<'table' | 'grid'>(isDesktop ? 'table' : 'grid');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleEdit = (product: Product): void => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleAdd = (): void => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = (): void => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  return {
    searchTerm,
    setSearchTerm,
    activeView,
    setActiveView,
    displayMode,
    setDisplayMode,
    selectedProduct,
    setSelectedProduct,
    editingProduct,
    isModalOpen,
    setIsModalOpen,
    handleEdit,
    handleAdd,
    handleCloseModal,
  };
};
