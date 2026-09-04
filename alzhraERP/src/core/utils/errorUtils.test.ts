import { describe, it, expect } from 'vitest';
import { parseError } from './errorUtils';

describe('parseError', () => {
  it('should return generic message for unknown errors (no rawMessage leak)', () => {
    const result = parseError(new Error('SOME_INTERNAL_DETAIL_THAT_SHOULD_NOT_LEAK'));
    // In production, unknown errors should NOT expose the raw message
    expect(result.message).toBe('حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.');
    expect(result.code).toBe('UNKNOWN');
  });

  it('should detect network errors', () => {
    const result = parseError(new Error('Failed to fetch'));
    expect(result.code).toBe('NETWORK_ERROR');
    expect(result.message).toBe('تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.');
  });

  it('should handle unique violation (23505)', () => {
    const result = parseError({ code: '23505', message: 'duplicate key' });
    expect(result.message).toBe('هذا السجل (رقم SKU أو الاسم) موجود مسبقاً في النظام.');

    const barcodeResult = parseError({
      code: '23505',
      message: 'duplicate key violates ux_products_company_barcode',
    });
    expect(barcodeResult.message).toBe('الباركود المدخل مسجل مسبقاً لصنف آخر في نفس المنشأة.');

    const phoneResult = parseError({
      code: '23505',
      message: 'duplicate key violates phone constraint',
    });
    expect(phoneResult.message).toBe('رقم الهاتف مسجل مسبقاً لجهة تعامل أخرى (عميل/مورد).');

    const taxResult = parseError({ code: '23505', message: 'duplicate key violates tax_number' });
    expect(taxResult.message).toBe('الرقم الضريبي مسجل مسبقاً في النظام.');
  });

  it('should handle foreign key violation (23503)', () => {
    const result = parseError({ code: '23503' });
    expect(result.message).toBe(
      'لا يمكن إتمام العملية لوجود سجلات أو بيانات أخرى مرتبطة بهذا السجل.'
    );
  });

  it('should handle permission error (42501)', () => {
    const result = parseError({ code: '42501' });
    expect(result.message).toBe('عذراً، لا تمتلك الصلاحيات الكافية لتنفيذ هذه العملية.');
  });

  it('should handle auth errors', () => {
    const result = parseError({ code: 'invalid_credentials' });
    expect(result.message).toBe('بيانات الدخول غير صحيحة. يرجى التأكد من البريد وكلمة المرور.');
  });

  it('should handle null/undefined gracefully', () => {
    const result = parseError(null);
    expect(result.severity).toBe('medium');
    expect(result.message).toBeTruthy();
  });

  it('should handle string errors', () => {
    const result = parseError('something broke');
    expect(result.message).toBe('حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.');
  });

  it('should pass through Arabic messages raised by our own RPCs', () => {
    const result = parseError({
      code: '23514',
      message: 'Cannot add lines to a posted journal entry',
    });
    // English technical internals stay masked
    expect(result.message).toBe('حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.');

    const arabic = parseError({ code: 'P0001', message: 'لا يوجد مستودع للفرع' });
    // Our own Arabic RAISE EXCEPTION messages reach the user as-is
    expect(arabic.message).toBe('لا يوجد مستودع للفرع');
    expect(arabic.code).toBe('P0001');
  });
});
