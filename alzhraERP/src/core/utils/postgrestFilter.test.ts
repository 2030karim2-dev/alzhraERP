import { describe, it, expect } from 'vitest';
import { buildIlikeOrFilter, buildEqOrFilter } from './postgrestFilter';

describe('buildIlikeOrFilter', () => {
  it('wraps the term in double quotes so commas do not break the or-filter', () => {
    const filter = buildIlikeOrFilter(['name_ar', 'sku'], 'مكس,123');
    expect(filter).toBe('name_ar.ilike."%مكس,123%",sku.ilike."%مكس,123%"');
  });

  it('strips double quotes from user input so it cannot escape the wrapping', () => {
    const filter = buildIlikeOrFilter(['barcode'], 'foo"bar,baz');
    expect(filter).not.toContain('"foo');
    expect(filter).toBe('barcode.ilike."%foobar,baz%"');
  });

  it('keeps parentheses and dots safe inside quoted values', () => {
    const filter = buildIlikeOrFilter(['part_number'], '(OEM).123');
    expect(filter).toBe('part_number.ilike."%(OEM).123%"');
  });

  it('joins multiple columns with commas at the syntax level only', () => {
    const filter = buildIlikeOrFilter(['a', 'b', 'c'], 'x');
    expect(filter).toBe('a.ilike."%x%",b.ilike."%x%",c.ilike."%x%"');
  });
});

describe('buildEqOrFilter', () => {
  it('wraps an exact-match value in quotes for each column', () => {
    const filter = buildEqOrFilter(['barcode', 'sku'], '123,456');
    expect(filter).toBe('barcode.eq."123,456",sku.eq."123,456"');
  });

  it('strips double quotes from barcodes', () => {
    const filter = buildEqOrFilter(['barcode'], '12"3');
    expect(filter).toBe('barcode.eq."123"');
  });
});
