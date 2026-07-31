
import { useState } from 'react';
// Fix: Corrected import path to point to the barrel file.
import { AccountingView } from '../types/index';

export const useAccountingView = () => {
  const [activeView, setActiveView] = useState<AccountingView>('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  const openJournalModal = () => setIsModalOpen(true);
  const closeJournalModal = () => setIsModalOpen(false);

  return {
    activeView,
    setActiveView,
    isModalOpen,
    openJournalModal,
    closeJournalModal,
    dateRange,
    setDateRange,
  };
};