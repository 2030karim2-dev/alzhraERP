import { describe, it, expect, beforeEach } from 'vitest';
import { draftStorage } from './draftStorage';

describe('draftStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and loads a draft successfully', () => {
    const draft = { items: [{ name: 'Item 1', qty: 2 }] };
    draftStorage.save('test_key', draft);

    const loaded = draftStorage.load<typeof draft>('test_key');
    expect(loaded).toEqual(draft);
  });

  it('returns null for non-existent key', () => {
    const loaded = draftStorage.load('missing_key');
    expect(loaded).toBeNull();
  });

  it('checks if draft exists correctly', () => {
    expect(draftStorage.exists('key_1')).toBe(false);
    draftStorage.save('key_1', { data: 'test' });
    expect(draftStorage.exists('key_1')).toBe(true);
  });

  it('clears draft successfully', () => {
    draftStorage.save('key_to_clear', { test: true });
    expect(draftStorage.exists('key_to_clear')).toBe(true);

    draftStorage.clear('key_to_clear');
    expect(draftStorage.exists('key_to_clear')).toBe(false);
    expect(draftStorage.load('key_to_clear')).toBeNull();
  });
});
