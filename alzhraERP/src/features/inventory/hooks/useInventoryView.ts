/* eslint-disable */
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBreakpoint } from '../../../lib/hooks/useBreakpoint';
import { Product } from '../types';

export const useInventoryView = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isDesktop = useBreakpoint('md');
  const initialSearch = searchParams.get('search') || '';
  const initialTab = searchParams.get('tab') || 'products';
  const [searchTerm, setSearchTermState] = useState(initialSearch);
  const [activeView, setActiveViewState] = useState(initialTab);
  const [displayMode, setDisplayMode] = useState<'table' | 'grid'>(isDesktop ? 'table' : 'grid');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Synchronize activeView with URL tab parameter when searchParams change externally
  useEffect(() => {
    const currentTab = searchParams.get('tab') || 'products';
    setActiveViewState(prev => (prev !== currentTab ? currentTab : prev));
  }, [searchParams]);

  const setActiveView = (view: string) => {
    const isChangingTab = view !== activeView;
    setActiveViewState(view);
    const nextParams = new URLSearchParams(searchParams);
    if (view && view !== 'products') {
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

  const setSearchTerm = (term: string) => {
    setSearchTermState(term);
    const nextParams = new URLSearchParams(searchParams);
    if (term) {
      nextParams.set('search', term);
    } else {
      nextParams.delete('search');
    }
    setSearchParams(nextParams, { replace: true });
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
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
