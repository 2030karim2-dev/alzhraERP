/**
 * Tests for the extracted ExcelTable theme tokens.
 */
import { describe, expect, it } from 'vitest';
import { EXCEL_TABLE_THEMES, ExcelTableColorTheme } from './excelTableThemes';

describe('excelTableThemes', () => {
    it('exposes all four supported color themes', () => {
        expect(Object.keys(EXCEL_TABLE_THEMES)).toEqual([
            'blue',
            'green',
            'orange',
            'indigo',
        ]);
    });

    it('provides every theme token for each theme', () => {
        const tokens = ['accent', 'border', 'text', 'sub', 'hover', 'glow', 'focusRing'] as const;
        for (const theme of Object.values(EXCEL_TABLE_THEMES)) {
            for (const token of tokens) {
                expect(theme[token], `${theme.accent}.${token}`).toBeTruthy();
            }
        }
    });

    it('keeps colorTheme values assignable to the exported union', () => {
        const theme: ExcelTableColorTheme = 'blue';
        expect(EXCEL_TABLE_THEMES[theme].accent).toContain('blue');
    });
});
