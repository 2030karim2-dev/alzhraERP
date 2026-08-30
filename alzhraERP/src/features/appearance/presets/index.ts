import type { ThemePreset } from '../types';
import { PREMIUM_PRESETS } from './premiumPresets';
import { CLASSIC_PRESETS } from './classicPresets';
import { CORPORATE_PRESETS } from './corporatePresets';
import { SPECIALTY_PRESETS } from './specialtyPresets';

export { normalize } from './normalize';
export type { RawTheme } from './normalize';
export { THEME_CATEGORIES } from './categories';
export { PREMIUM_PRESETS } from './premiumPresets';
export { CLASSIC_PRESETS } from './classicPresets';
export { CORPORATE_PRESETS } from './corporatePresets';
export { SPECIALTY_PRESETS } from './specialtyPresets';

export const THEME_PRESETS: ThemePreset[] = [
  ...PREMIUM_PRESETS,
  ...CLASSIC_PRESETS,
  ...CORPORATE_PRESETS,
  ...SPECIALTY_PRESETS,
];
