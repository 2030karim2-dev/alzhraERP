import React from 'react';
import type { EntityCardMetadata } from '../../types';
import { ProductCard } from './ProductCard';
import { VinCard } from './VinCard';
import { TransferCard } from './TransferCard';
import { InvoiceCard } from './InvoiceCard';

interface Props {
  messageId: string;
  metadata: EntityCardMetadata;
}

export const EntityCardMessage: React.FC<Props> = ({ messageId, metadata }) => {
  if (!metadata?.entity_type) return null;

  switch (metadata.entity_type) {
    case 'product':
      return <ProductCard metadata={metadata} />;
    case 'vin':
      return <VinCard metadata={metadata} />;
    case 'transfer':
      return <TransferCard messageId={messageId} metadata={metadata} />;
    case 'invoice':
      return <InvoiceCard metadata={metadata} />;
    default:
      return null;
  }
};
