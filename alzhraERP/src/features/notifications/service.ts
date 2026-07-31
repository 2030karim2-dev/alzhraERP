
import { inventoryApi } from '../inventory/api';
import { partiesApi } from '../parties/api';
import { useNotificationStore } from './store';

export const notificationService = {
  checkSystemHealth: async (companyId: string) => {
    const { addNotification } = useNotificationStore.getState();

    try {
      // Fix: Changed getProductsRaw to getProducts as it returns the necessary data
      const { data: products } = await inventoryApi.getProducts(companyId);
      const lowStockItems = products?.filter((p: any) => {
        const stock = (p.product_stock || []).reduce((acc: number, curr: any) => acc + curr.quantity, 0);
        return stock <= (p.min_stock_level || 5);
      });

      if (lowStockItems && lowStockItems.length > 0) {
        addNotification({
          companyId,
          title: 'تنبيه مخزون حرج',
          message: `يوجد ${lowStockItems.length} أصناف وصلت للحد الأدنى. يرجى مراجعة المخزون لإعادة الطلب.`,
          type: 'warning',
          link: '/inventory?view=low-stock'
        });
      }

      // 2. Check High Debts (Customers)
      const { data: customers } = await partiesApi.getParties(companyId, 'customer');
      const riskyCustomers = customers?.filter((c: any) => c.balance > 5000); // Threshold example

      if (riskyCustomers && riskyCustomers.length > 0) {
        addNotification({
          companyId,
          title: 'تنبيه حد ائتماني',
          message: `هناك ${riskyCustomers.length} عملاء تجاوزت مديونيتهم 5000 ريال.`,
          type: 'info',
          link: '/reports?tab=debt_report'
        });
      }

    } catch (error) {
      console.error("Health Check Failed", error);
    }
  }
};
