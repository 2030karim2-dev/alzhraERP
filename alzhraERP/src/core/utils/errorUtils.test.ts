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
});
