import { describe, it, expect } from 'vitest';
import { shouldRetryQuery } from './queryClient';

describe('shouldRetryQuery', () => {
  it('never retries PGRST116 / HTTP 406 (row not found via .single())', () => {
    expect(
      shouldRetryQuery(0, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' })
    ).toBe(false);
    expect(shouldRetryQuery(2, { status: 406, message: 'Not Acceptable' })).toBe(false);
    expect(shouldRetryQuery(5, { code: 'PGRST116' })).toBe(false);
  });

  it('never retries auth failures (fail fast to the login flow)', () => {
    expect(shouldRetryQuery(0, { code: 401 })).toBe(false);
    expect(shouldRetryQuery(0, { code: 403 })).toBe(false);
    expect(shouldRetryQuery(0, { code: 'PGRST301' })).toBe(false);
    expect(shouldRetryQuery(0, { message: 'JWT expired' })).toBe(false);
    expect(shouldRetryQuery(0, { message: 'Invalid Refresh Token: ...' })).toBe(false);
    expect(shouldRetryQuery(0, { message: 'not authenticated' })).toBe(false);
  });

  it('retries transient failures up to 3 attempts', () => {
    expect(shouldRetryQuery(0, { message: 'network error' })).toBe(true);
    expect(shouldRetryQuery(1, { message: 'network error' })).toBe(true);
    expect(shouldRetryQuery(2, { message: 'network error' })).toBe(true);
    expect(shouldRetryQuery(3, { message: 'network error' })).toBe(false);
  });

  it('tolerates a missing/undefined error object', () => {
    expect(shouldRetryQuery(0)).toBe(true);
    expect(shouldRetryQuery(0, null)).toBe(true);
  });
});
