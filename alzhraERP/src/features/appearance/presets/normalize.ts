import type { ThemeCSSVars, ThemePreset } from '../types';

export type RawTheme = Omit<ThemePreset, 'cssVars'> & { cssVars?: ThemeCSSVars };

/**
 * Restores the required cssVars field for compact dual-mode presets.
 * For legacy single-mode themes the explicit cssVars is always kept.
 */
export const normalize = (theme: RawTheme): ThemePreset => ({
  ...theme,
  cssVars: theme.cssVars ?? (theme.isDark ? theme.dark! : theme.light!),
});
