import { useState } from 'react';
import type { AccountingView } from '../types';
import { formatLocalDate, getLocalYearStart } from '../../../core/utils';

export const useAccountingView = () => {
  const [activeView, setActiveView] = useState<AccountingView>('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: getLocalYearStart(),
    to: formatLocalDate(),
  });

  const openJournalModal = () => {
    setIsModalOpen(true);
  };
  const closeJournalModal = () => {
    setIsModalOpen(false);
  };

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
