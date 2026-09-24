/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import React from 'react';
import { BondVoucherModal } from '../../../bonds/components/BondVoucherModal';
import type { Bond } from '../../../bonds/types';
import InvoiceDetailsModal from '../../../sales/components/details/InvoiceDetailsModal';

interface StatementDocumentModalsProps {
  activeInvoiceId: string | null;
  onCloseInvoiceModal: () => void;
  activeBond: Bond | null;
  isBondModalOpen: boolean;
  onCloseBondModal: () => void;
}

export const StatementDocumentModals: React.FC<StatementDocumentModalsProps> = ({
  activeInvoiceId,
  onCloseInvoiceModal,
  activeBond,
  isBondModalOpen,
  onCloseBondModal,
}) => {
  return (
    <>
      {/* Invoice Details Modal */}
      {activeInvoiceId && (
        <InvoiceDetailsModal invoiceId={activeInvoiceId} onClose={onCloseInvoiceModal} />
      )}

      {/* Bond Voucher Modal */}
      {activeBond && (
        <BondVoucherModal isOpen={isBondModalOpen} bond={activeBond} onClose={onCloseBondModal} />
      )}
    </>
  );
};
