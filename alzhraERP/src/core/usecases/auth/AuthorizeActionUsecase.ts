import { AuthUser } from '../../../features/auth/types';

type Action =
  | 'delete_product'
  | 'create_product'
  | 'close_fiscal_year'
  | 'edit_posted_invoice'
  | 'view_financial_reports'
  | 'create_purchase'
  | 'delete_party'
  | 'post_journal_entry'
  | 'create_expense'
  | 'create_bond'
  | 'delete_bond'
  | 'create_sale_return';

export class AuthorizeActionUsecase {

  static canPerform(user: AuthUser | null, action: Action): boolean {
    if (!user) return false;
    
    // Owner bypass or specific permission check
    if (user.role === 'owner') return true;

    const permissions = user.permissions || [];
    return permissions.includes(action);
  }

  static requireAdmin(user: AuthUser | null) {
    if (user?.role !== 'owner') {
      throw new Error("هذه العملية تتطلب صلاحيات مدير النظام (Owner)");
    }
  }

  static validateAction(user: AuthUser | null, action: Action) {
    if (!this.canPerform(user, action)) {
      const actionNames: Record<string, string> = {
        'create_expense': 'تسجيل مصروفات',
        'create_bond': 'إصدار سندات مالية',
        'post_journal_entry': 'ترحيل قيود محاسبية',
        'delete_party': 'حذف جهات (عملاء/موردين)',
        'create_sale_return': 'إنشاء مرتجع مبيعات'
      };
      throw new Error(`عذراً، لا تمتلك صلاحية كافية لتنفيذ: [${actionNames[action] || action}] - يرجى مراجعة الصلاحيات في النظام`);
    }
  }
}