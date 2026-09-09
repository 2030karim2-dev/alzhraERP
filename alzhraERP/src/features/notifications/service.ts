import { logger } from '../../core/utils/logger';
import { inventoryApi } from '../inventory/api';
import { partiesApi } from '../parties/api';
import { useNotificationStore } from './store';

export const notificationService = {
  /**
   * Periodic health & stock check with strict deduplication tags.
   */
  checkSystemHealth: async (companyId: string) => {
    if (!companyId) return;
    const { addNotification } = useNotificationStore.getState();

    try {
      // 1. Check Low Stock Items
      const { data: products } = await inventoryApi.getProducts(companyId);
      const lowStockItems = products?.filter((p: any) => {
        const stock = (p.product_stock || []).reduce(
          (acc: number, curr: any) => acc + (curr.quantity || 0),
          0
        );
        return stock <= (p.min_stock_level ?? 5);
      });

      if (lowStockItems && lowStockItems.length > 0) {
        const sampleNames = lowStockItems
          .slice(0, 3)
          .map((item: any) => item.name || item.name_ar)
          .filter(Boolean)
          .join('، ');

        const previewText = sampleNames ? ` (أبرزها: ${sampleNames})` : '';

        addNotification({
          companyId,
          tag: 'low_stock_summary',
          category: 'inventory',
          priority: 'high',
          title: 'تنبيه مخزون حرج',
          message: `يوجد ${lowStockItems.length} صنف وصل للحد الأدنى أو نفد${previewText}. يرجى مراجعة المخزون لإعادة الطلب.`,
          type: 'warning',
          link: '/inventory?view=low-stock',
          actions: [
            {
              label: 'مراجعة النواقص',
              link: '/inventory?view=low-stock',
              isPrimary: true,
            },
          ],
        });
      }

      // 2. Check High Debts (Customers)
      const { data: customers } = await partiesApi.getParties(companyId, 'customer');
      const riskyCustomers = customers?.filter((c: any) => (c.balance || 0) > 10000);

      if (riskyCustomers && riskyCustomers.length > 0) {
        addNotification({
          companyId,
          tag: 'high_debt_summary',
          category: 'debt',
          priority: 'normal',
          title: 'تنبيه سقف المديونيات',
          message: `هناك ${riskyCustomers.length} عملاء تجاوزت مديونيتهم 10,000 ريال.`,
          type: 'info',
          link: '/reports?tab=debt_report',
          actions: [
            {
              label: 'تقرير الديون',
              link: '/reports?tab=debt_report',
              isPrimary: true,
            },
          ],
        });
      }
    } catch (error) {
      logger.error('service', 'Health Check Failed', error);
    }
  },

  /**
   * Helper to trigger in-app notification for new sales.
   */
  notifySale: (
    companyId: string,
    invoiceNumber: string | number,
    customerName?: string,
    total?: number,
    currency = 'YER'
  ) => {
    if (!companyId) return;
    const { addNotification } = useNotificationStore.getState();
    const formattedTotal = total ? ` بمبلغ ${total.toLocaleString()} ${currency}` : '';
    const customer = customerName ? ` للعميل ${customerName}` : ' (نقدي)';

    addNotification({
      companyId,
      category: 'sales',
      priority: 'normal',
      title: `فاتورة بيع #${invoiceNumber}`,
      message: `تم تسجيل فاتورة مبيعات جديدة${formattedTotal}${customer}.`,
      type: 'success',
      link: '/sales',
      actions: [
        {
          label: 'عرض الفواتير',
          link: '/sales',
          isPrimary: true,
        },
      ],
    });
  },

  /**
   * Helper to trigger in-app notification for bonds (receipt / payment).
   */
  notifyBond: (
    companyId: string,
    bondNumber: string | number,
    type: 'receipt' | 'payment',
    amount: number,
    currency = 'YER',
    partyName?: string
  ) => {
    if (!companyId) return;
    const { addNotification } = useNotificationStore.getState();
    const isReceipt = type === 'receipt';

    addNotification({
      companyId,
      category: 'finance',
      priority: 'normal',
      title: `${isReceipt ? 'سند قبض' : 'سند صرف'} #${bondNumber}`,
      message: `تم تسجيل ${isReceipt ? 'قبض' : 'صرف'} مبلغ ${amount.toLocaleString()} ${currency}${partyName ? ` لصالح ${partyName}` : ''}.`,
      type: isReceipt ? 'success' : 'info',
      link: '/bonds',
      actions: [
        {
          label: 'عرض السندات',
          link: '/bonds',
          isPrimary: true,
        },
      ],
    });
  },
};
