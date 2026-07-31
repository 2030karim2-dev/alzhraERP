import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../auth/hooks';

export interface CustomerDebtProfile {
  id: string;
  name: string;
  phone?: string;
  totalDebt: number;
  overdueAmount: number;
  overdueInvoicesCount: number;
  lastPurchaseDate?: string;
  riskLevel: 'Reliable' | 'Occasionally Late' | 'Frequently Late' | 'High Risk';
  priorityLevel: 'High' | 'Medium' | 'Low';
  priorityScore: number;
  recommendation: string;
  invoices: DebtInvoice[];
}

export interface DebtInvoice {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  issueDate: string;
  status: 'pending' | 'overdue' | 'paid';
  daysOverdue?: number;
}

export interface DebtAlert {
  id: string;
  type: 'overdue' | 'due_soon' | 'behavior';
  message: string;
  severity: 'high' | 'medium' | 'low';
  customerId?: string;
}

export interface SmartReminder {
  id: string;
  customerId: string;
  customerName: string;
  invoiceId: string;
  invoiceNumber: string;
  type: 'before_due' | 'on_due' | 'after_due' | 'long_overdue' | 'inactive';
  message: string;
}

export interface DebtMetrics {
  totalReceivables: number;
  totalOverdue: number;
  overduePercentage: number;
  pendingInvoicesCount: number;
  atRiskCustomersCount: number;
}

export const useDebtManagement = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<DebtMetrics>({
    totalReceivables: 0,
    totalOverdue: 0,
    overduePercentage: 0,
    pendingInvoicesCount: 0,
    atRiskCustomersCount: 0,
  });
  const [customers, setCustomers] = useState<CustomerDebtProfile[]>([]);
  const [alerts, setAlerts] = useState<DebtAlert[]>([]);
  const [reminders, setReminders] = useState<SmartReminder[]>([]);

  useEffect(() => {
    if (authLoading) return;

    if (user?.id) {
      fetchDebtData();
    } else {
      setError("وضع غير متصل أو غير مسجل الدخول: لا يمكن تحميل بيانات الجعفري.");
      setLoading(false);
    }
  }, [user?.id, authLoading]);

  const generateReminderMessage = (
    customerName: string,
    invoiceNumber: string,
    dueDate: string,
    type: SmartReminder['type']
  ) => {
    switch (type) {
      case 'before_due':
        return `مرحباً ${customerName}، تذكير ودي بأن الفاتورة رقم #${invoiceNumber} تستحق السداد بتاريخ ${dueDate}. نشكركم على ثقتكم بنا.`;
      case 'on_due':
        return `مرحباً ${customerName}، نود تذكيركم بأن الفاتورة رقم #${invoiceNumber} تستحق السداد اليوم. يرجى إعلامنا إذا كنتم بحاجة لأي مساعدة.`;
      case 'after_due':
        return `مرحباً ${customerName}، نود تذكيركم بأن الفاتورة رقم #${invoiceNumber} المستحقة بتاريخ ${dueDate} لا تزال معلقة ولم يتم سدادها. يرجى إعلامنا في حال وجود أي مشكلة.`;
      case 'long_overdue':
        return `مرحباً ${customerName}، نأمل أن تكونوا بخير. لاحظنا أن الفاتورة رقم #${invoiceNumber} لا تزال غير مسددة بالرغم من تأخرها لفترة. يرجى إعلامنا بالوقت المناسب لحل هذا الأمر.`;
      case 'inactive':
        return `مرحباً ${customerName}، لاحظنا أنه مر بعض الوقت منذ آخر طلب لكم. نأمل أن يكون كل شيء على ما يرام ونتطلع لخدمتكم قريباً.`;
      default:
        return '';
    }
  };

  const fetchDebtData = async () => {
    if (!user?.company_id) {
        setError('حسابك لا يحتوي على معرف شركة (company_id). يرجى التأكد من التسجيل الصحيح.');
        setLoading(false);
        return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const companyId = user.company_id;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch Customers and their Invoices in a single optimized query
      const { data: partiesData, error: partiesError } = await supabase
        .from('parties')
        .select(`
          id,
          name,
          phone,
          invoices (
            id,
            invoice_number,
            total_amount,
            paid_amount,
            issue_date,
            due_date,
            type,
            status
          )
        `)
        .eq('company_id', companyId)
        .eq('type', 'customer')
        .is('deleted_at', null);

      if (partiesError) throw partiesError;

      // Process Data
      let tempTotalReceivables = 0;
      let tempTotalOverdue = 0;
      let tempPendingInvoices = 0;
      let tempAtRiskCount = 0;
      
      const newAlerts: DebtAlert[] = [];
      const newReminders: SmartReminder[] = [];
      const profiles: CustomerDebtProfile[] = [];

      (partiesData || []).forEach((party: any) => {
        // Filter the embedded invoices for posted sales only
        const partyInvoices = (party.invoices || []).filter((inv: any) => inv.type === 'sale' && inv.status === 'posted');
        
        const debtInvoices: DebtInvoice[] = [];
        let totalDebt = 0;
        let overdueAmount = 0;
        let overdueCount = 0;
        let mostRecentPurchase: Date | null = null;

        partyInvoices.forEach((inv: any) => {
            const invoiceDate = new Date(inv.issue_date);
            if (!mostRecentPurchase || invoiceDate > mostRecentPurchase) {
                mostRecentPurchase = invoiceDate;
            }

            const remainingAmount = Number(inv.total_amount) - Number(inv.paid_amount || 0);
            if (remainingAmount <= 0) return; // Completely paid
            
            tempTotalReceivables += remainingAmount;
            totalDebt += remainingAmount;
            tempPendingInvoices++;

            const dueDate = inv.due_date ? new Date(inv.due_date) : new Date(inv.issue_date);
            // Default terms if no due date: let's assume due date is issue date for now, or 30 days if standard business.
            // But we will respect the database due_date first.
            
            let status: 'pending' | 'overdue' | 'paid' = 'pending';
            const diffTime = today.getTime() - dueDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > 0) {
              status = 'overdue';
              tempTotalOverdue += remainingAmount;
              overdueAmount += remainingAmount;
              overdueCount++;
              
              if (diffDays > 30) {
                 newReminders.push({
                     id: `rem_${inv.id}_long_od`,
                     customerId: party.id,
                     customerName: party.name,
                     invoiceId: inv.id,
                     invoiceNumber: inv.invoice_number,
                     type: 'long_overdue',
                     message: generateReminderMessage(party.name, inv.invoice_number, dueDate.toLocaleDateString('ar-SA'), 'long_overdue')
                 });
                 newAlerts.push({
                     id: `alt_${inv.id}_long`,
                     type: 'overdue',
                     severity: 'high',
                     message: `العميل ${party.name} لديه فاتورة متأخرة جداً لأكثر من 30 يوماً.`,
                     customerId: party.id
                 });
              } else {
                  newReminders.push({
                      id: `rem_${inv.id}_after`,
                      customerId: party.id,
                      customerName: party.name,
                      invoiceId: inv.id,
                      invoiceNumber: inv.invoice_number,
                      type: 'after_due',
                      message: generateReminderMessage(party.name, inv.invoice_number, dueDate.toLocaleDateString('ar-SA'), 'after_due')
                  });
              }
            } else if (diffDays === 0) {
                  newReminders.push({
                      id: `rem_${inv.id}_on`,
                      customerId: party.id,
                      customerName: party.name,
                      invoiceId: inv.id,
                      invoiceNumber: inv.invoice_number,
                      type: 'on_due',
                      message: generateReminderMessage(party.name, inv.invoice_number, dueDate.toLocaleDateString('ar-SA'), 'on_due')
                  });
            } else if (diffDays >= -3) {
                 // Due within 3 days
                  newReminders.push({
                      id: `rem_${inv.id}_before`,
                      customerId: party.id,
                      customerName: party.name,
                      invoiceId: inv.id,
                      invoiceNumber: inv.invoice_number,
                      type: 'before_due',
                      message: generateReminderMessage(party.name, inv.invoice_number, dueDate.toLocaleDateString('ar-SA'), 'before_due')
                  });
                  newAlerts.push({
                      id: `alt_${inv.id}_soon`,
                      type: 'due_soon',
                      severity: 'medium',
                      message: `الفاتورة ${inv.invoice_number} للعميل ${party.name} تستحق خلال ${Math.abs(diffDays)} أيام.`,
                      customerId: party.id
                  });
            }

            debtInvoices.push({
                id: inv.id,
                invoiceNumber: inv.invoice_number,
                totalAmount: Number(inv.total_amount),
                paidAmount: Number(inv.paid_amount || 0),
                remainingAmount,
                dueDate: dueDate.toISOString(),
                issueDate: inv.issue_date,
                status,
                ...(diffDays > 0 ? { daysOverdue: diffDays } : {})
            });
        });

        // Calculate Risk Level based on late payments profile
        let riskLevel: 'Reliable' | 'Occasionally Late' | 'Frequently Late' | 'High Risk' = 'Reliable';
        let recommendation = 'يمكن تقديم التسهيلات الائتمانية بأمان.';
        let riskScoreMultiplier = 0; // For priority calc
        
        if (overdueCount > 3 || (overdueAmount > 0 && overdueAmount / (totalDebt || 1) > 0.7)) {
            riskLevel = 'High Risk';
            recommendation = 'يُنصح بإيقاف التسهيلات الائتمانية وتقييد المعاملات نقداً فقط.';
            tempAtRiskCount++;
            riskScoreMultiplier = 100;
        } else if (overdueCount >= 2) {
             riskLevel = 'Frequently Late';
             recommendation = 'تقليل الحد الائتماني والمتابعة الدورية للسداد.';
             riskScoreMultiplier = 50;
        } else if (overdueCount === 1) {
             riskLevel = 'Occasionally Late';
             recommendation = 'مراقبة الحساب وتذكير العميل بمواعيد الاستحقاق القادمة.';
             riskScoreMultiplier = 20;
        }

        // Calculate Collection Priority Score
        // Formula: (overdue_days * 0.4) + (overdue_amount * 0.3) + (late_payment_history * 0.2) + (customer_risk_level * 0.1)
        
        const maxDaysOverdue = debtInvoices.reduce((max, inv) => inv.daysOverdue ? Math.max(max, inv.daysOverdue) : max, 0);
        
        // Normalize overdue amount (hypothetical max 50,000 for scaling)
        let normalizedAmountScore = (overdueAmount / 50000) * 100;
        if (normalizedAmountScore > 100) normalizedAmountScore = 100;

        const priorityScore = Math.round(
            (maxDaysOverdue * 0.4) + 
            (normalizedAmountScore * 0.3) + 
            ((overdueCount > 0 ? (overdueCount / 5) * 100 : 0) * 0.2) + 
            (riskScoreMultiplier * 0.1)
        );

        let priorityLevel: 'High' | 'Medium' | 'Low' = 'Low';
        if (priorityScore >= 60) {
            priorityLevel = 'High';
            if (recommendation === 'مراقبة الحساب وتذكير العميل بمواعيد الاستحقاق القادمة.') {
                recommendation = 'عالي الأولوية للتحصيل: قم بالتواصل هاتفياً للمطالبة بالسداد فوراً.';
            } else if (riskLevel === 'High Risk') {
                recommendation = 'عالي الأولوية للتحصيل: إيقاف التسهيلات وإرسال إنذار أخير للسداد.';
            }
        } else if (priorityScore >= 30) {
            priorityLevel = 'Medium';
            if (recommendation === 'مراقبة الحساب وتذكير العميل بمواعيد الاستحقاق القادمة.') {
                recommendation = 'أولوية متوسطة: إرسال رسالة تذكير للمتابعة.';
            }
        }

        // Check inactivity
        if (mostRecentPurchase) {
             const recentDate = mostRecentPurchase as Date;
             const daysSinceLastPurchase = Math.ceil((today.getTime() - recentDate.getTime()) / (1000 * 60 * 60 * 24));
             if (daysSinceLastPurchase >= 90) { // 3 months inactive
                 newReminders.push({
                     id: `rem_inactive_${party.id}`,
                     customerId: party.id,
                     customerName: party.name,
                     invoiceId: '',
                     invoiceNumber: '',
                     type: 'inactive',
                     message: generateReminderMessage(party.name, '', '', 'inactive')
                 });
             }
        }

        if (totalDebt > 0) {
            profiles.push({
                id: party.id,
                name: party.name,
                phone: party.phone,
                totalDebt,
                overdueAmount,
                overdueInvoicesCount: overdueCount,
                ...(mostRecentPurchase ? { lastPurchaseDate: (mostRecentPurchase as Date).toISOString() } : {}),
                riskLevel,
                priorityLevel,
                priorityScore,
                recommendation,
                invoices: debtInvoices
            });
        }
      });

      // Sort profiles by Priority Score first, then Overdue Amount
      profiles.sort((a, b) => b.priorityScore - a.priorityScore || b.overdueAmount - a.overdueAmount);

      setMetrics({
          totalReceivables: tempTotalReceivables,
          totalOverdue: tempTotalOverdue,
          overduePercentage: tempTotalReceivables > 0 ? (tempTotalOverdue / tempTotalReceivables) * 100 : 0,
          pendingInvoicesCount: tempPendingInvoices,
          atRiskCustomersCount: tempAtRiskCount
      });
      
      setCustomers(profiles);
      setAlerts(newAlerts);
      setReminders(newReminders);

    } catch (err: any) {
      console.error('Error fetching debt data:', err);
      setError(err.message || 'حدث خطأ أثناء تحميل بيانات الديون');
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    metrics,
    customers,
    alerts,
    reminders,
    refreshData: fetchDebtData
  };
};
