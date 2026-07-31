import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Product } from '../types';

export const useInventoryView = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const [searchTerm, setSearchTermState] = useState(initialSearch);
  const [activeView, setActiveView] = useState('products');
  const [displayMode, setDisplayMode] = useState<'table' | 'grid'>('table');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const setSearchTerm = (term: string) => {
    setSearchTermState(term);
    if (term) {
      setSearchParams({ search: term }, { replace: true });
    } else {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('search');
      setSearchParams(nextParams, { replace: true });
    }
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
    handleCloseModal
  };
};
