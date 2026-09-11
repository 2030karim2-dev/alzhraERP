import { logger } from '../../core/utils/logger';
import { inventoryApi } from '../inventory/api';
import { partiesApi } from '../parties/api';
import { useNotificationStore } from './store';

export const notificationService = {
  /**
   * Periodic health & stock check with strict deduplication tags.
   */
  checkSystemHealth: async (companyId: string, branchId?: string | null) => {
    if (!companyId) return;
    const { addNotification } = useNotificationStore.getState();

    try {
      // 1. Check Strategic (Core) Backbone Products & Custom Low Stock Thresholds
      const { data: products } = await inventoryApi.getProducts(companyId);
      const lowStockItems = (products || []).filter((p: any) => {
        const rawStockList = Array.isArray(p.stock)
          ? p.stock
          : Array.isArray(p.product_stock)
            ? p.product_stock
            : [];
        const stockList = branchId
          ? rawStockList.filter((s: any) => !s.branch_id || s.branch_id === branchId)
          : rawStockList;
        const stock = stockList.reduce(
          (acc: number, curr: any) => acc + (Number(curr.quantity) || 0),
          0
        );

        const isCore = Boolean(p.is_core);
        const configuredMin = Number(p.min_stock_level) || 0;

        // Core products alert when approaching exhaustion (configured threshold or <= 3 pieces)
        if (isCore) {
          const threshold = configuredMin > 0 ? configuredMin : 3;
          return stock <= threshold;
        }

        // Standard products ONLY alert if the user explicitly set a positive threshold
        return configuredMin > 0 && stock <= configuredMin;
      });

      if (lowStockItems && lowStockItems.length > 0) {
        const coreAlerts = lowStockItems.filter((item: any) => Boolean(item.is_core));
        const sampleNames = lowStockItems
          .slice(0, 3)
          .map((item: any) => item.name_ar || item.name)
          .filter(Boolean)
          .join('، ');

        const previewText = sampleNames ? ` (أبرزها: ${sampleNames})` : '';
        const isCoreFocused = coreAlerts.length > 0;

        addNotification({
          companyId,
          tag: 'low_stock_summary',
          category: 'inventory',
          priority: isCoreFocused ? 'high' : 'normal',
          title: isCoreFocused
            ? 'تنبيه أصناف استراتيجية (العمود الفقري)'
            : 'تنبيه انخفاض المخزون للحد الأدنى',
          message: isCoreFocused
            ? `يوجد ${coreAlerts.length} صنف استراتيجي قارب على النفاذ أو نفد${previewText}. يرجى تأمين الكميات لتفادي توقف المبيعات.`
            : `يوجد ${lowStockItems.length} صنف وصل للحد الأدنى المحدد${previewText}.`,
          type: 'warning',
          link: isCoreFocused ? '/inventory?tab=core_products' : '/inventory?tab=products',
          actions: [
            {
              label: isCoreFocused ? 'مراجعة الأصناف الاستراتيجية' : 'مراجعة المخزون',
              link: isCoreFocused ? '/inventory?tab=core_products' : '/inventory?tab=products',
              isPrimary: true,
            },
          ],
        });
      }

      // 2. Check High Debts (Customers)
      const { data: customers } = await partiesApi.getParties(companyId, 'customer');
      const riskyCustomers = customers?.filter((c: any) => {
        const balance = c.party_balances?.[0]?.balance ?? c.balance ?? 0;
        return Number(balance) > 10000;
      });

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
