
import { salesService } from '../../../features/sales/service';
import { CreateInvoiceDTO } from '../../../features/sales/types';

/**
 * Usecase: معالجة عملية البيع الكاملة من نقطة البيع
 * التنسيق أصبح يتم الآن في طبقة قاعدة البيانات لضمان الموثوقية
 */
export class ProcessPOSCheckoutUsecase {
  static async execute(data: CreateInvoiceDTO, companyId: string, userId: string) {


    // يتم إرسال الفاتورة للخدمة، والتي بدورها تستدعي RPC
    // الـ RPC في قاعدة البيانات يقوم بـ:
    // 1. إنشاء الفاتورة
    // 2. خصم المخزون
    // 3. إنشاء القيد المحاسبي
    // 4. تحديث رصيد العميل
    const invoice = await salesService.processNewSale(companyId, userId, data);


    return invoice;
  }
}
