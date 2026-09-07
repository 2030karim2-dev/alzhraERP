import { describe, it, expect } from 'vitest';
import { getLocalCrossSellSuggestions } from './automotiveCrossSell';

describe('automotiveCrossSell', () => {
  it('returns empty array when cart is empty', () => {
    expect(getLocalCrossSellSuggestions([])).toEqual([]);
  });

  it('suggests oil filter and air filter when engine oil is in cart', () => {
    const suggestions = getLocalCrossSellSuggestions(['زيت محرك تويوتا 5W-30']);
    expect(suggestions).toContain('فلتر زيت محرك');
    expect(suggestions).toContain('فلتر هواء محرك');
  });

  it('suggests rotors and brake fluid when brake pads are in cart', () => {
    const suggestions = getLocalCrossSellSuggestions(['قماشات فرامل أمامية كورولا']);
    expect(suggestions).toContain('هوبات فرامل أمامية');
    expect(suggestions).toContain('زيت فرامل DOT4');
  });

  it('does not suggest an item that is already in the cart', () => {
    const suggestions = getLocalCrossSellSuggestions(['زيت محرك 5W30', 'فلتر زيت محرك أصلي']);
    expect(suggestions).not.toContain('فلتر زيت محرك');
    expect(suggestions).toContain('فلتر هواء محرك');
  });

  it('returns universal fallback maintenance items when cart contains generic or unmapped item', () => {
    const suggestions = getLocalCrossSellSuggestions(['قطعة غير معرفة 123']);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions).toContain('فلتر زيت محرك');
  });
});
