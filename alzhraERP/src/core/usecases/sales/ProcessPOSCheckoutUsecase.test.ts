import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { CreateInvoiceDTO } from '../../../features/sales/types';

vi.mock('../../../features/sales/service', () => ({
  salesService: { processNewSale: vi.fn() },
}));

import { salesService } from '../../../features/sales/service';
import { ProcessPOSCheckoutUsecase } from './ProcessPOSCheckoutUsecase';

const mockProcessNewSale = salesService.processNewSale as ReturnType<typeof vi.fn>;

describe('ProcessPOSCheckoutUsecase', () => {
  const basePayload: CreateInvoiceDTO = {
    partyId: null,
    type: 'sale',
    items: [
      {
        productId: 'p1',
        name: 'منتج اختباري',
        sku: 'SKU-1',
        quantity: 1,
        unitPrice: 100,
        costPrice: 60,
        maxStock: 0,
      },
    ],
    discount: 0,
    status: 'posted',
    paymentMethod: 'cash',
  };

  beforeEach(() => {
    mockProcessNewSale.mockReset();
  });

  it('delegates the full checkout to salesService.processNewSale', async () => {
    const invoice = { id: 'inv-1' };
    mockProcessNewSale.mockResolvedValue(invoice);

    const result = await ProcessPOSCheckoutUsecase.execute(basePayload, 'company-1', 'user-1');

    expect(mockProcessNewSale).toHaveBeenCalledTimes(1);
    expect(mockProcessNewSale).toHaveBeenCalledWith('company-1', 'user-1', basePayload);
    expect(result).toBe(invoice);
  });

  it('propagates service failures to the caller', async () => {
    mockProcessNewSale.mockRejectedValue(new Error('RPC failed'));

    await expect(
      ProcessPOSCheckoutUsecase.execute(basePayload, 'company-1', 'user-1')
    ).rejects.toThrow('RPC failed');
  });
});
