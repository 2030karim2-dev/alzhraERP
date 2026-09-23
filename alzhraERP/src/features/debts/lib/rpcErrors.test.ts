import { describe, it, expect } from 'vitest';
import { debtRpcErrorMessage } from './rpcErrors';

describe('debtRpcErrorMessage', () => {
  it('translates known server codes to Arabic', () => {
    expect(debtRpcErrorMessage('INVALID_TASK')).toContain('المهمة');
    expect(debtRpcErrorMessage('INVALID_PARTY')).toContain('غير تابع');
    expect(debtRpcErrorMessage('INVALID_COLLECTOR')).toContain('المحصّل');
    expect(debtRpcErrorMessage('INVALID_PRIORITY')).toContain('أولوية');
  });

  it('keeps unknown server messages unchanged', () => {
    expect(debtRpcErrorMessage('عذراً، لا تمتلك صلاحية تنفيذ هذه العملية.')).toBe(
      'عذراً، لا تمتلك صلاحية تنفيذ هذه العملية.'
    );
  });

  it('falls back to a generic Arabic message for empty input', () => {
    expect(debtRpcErrorMessage(null)).toContain('غير متوقع');
    expect(debtRpcErrorMessage('   ')).toContain('غير متوقع');
  });
});
