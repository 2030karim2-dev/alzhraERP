
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { THEME_PRESETS } from '../features/appearance/constants';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeSettings {
  accentColor: string;
  font: string;
  radius: number;
  fontSize: number;
  shadowStrength: number;
  glassBlur: number;
  glassOpacity: number;
}

interface ThemeState {
  mode: ThemeMode;
  theme: 'light' | 'dark';
  activePresetId: string;

  accentColor: string;
  font: string;
  radius: number;
  fontSize: number;
  shadowStrength: number;
  glassBlur: number;
  glassOpacity: number;

  draftSettings: ThemeSettings;

  setMode: (mode: ThemeMode) => void;
  setPreset: (id: string) => void;

  setDraftAccentColor: (color: string) => void;
  setDraftFont: (font: string) => void;
  setDraftRadius: (radius: number) => void;
  setDraftFontSize: (size: number) => void;
  setDraftShadowStrength: (strength: number) => void;
  setDraftGlassBlur: (blur: number) => void;
  setDraftGlassOpacity: (opacity: number) => void;

  saveAppearanceSettings: () => void;
  revertAppearanceSettings: () => void;

  initializeTheme: () => void;
  toggleTheme: () => void;
}

const applyTheme = (mode: ThemeMode): 'light' | 'dark' => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return mode === 'dark' ? 'dark' : 'light';
  }

  const themeToApply = mode === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : mode;
  document.documentElement.classList.toggle('dark', themeToApply === 'dark');
  return themeToApply;
};

const applyAccent = (color: string) => typeof document !== 'undefined' && document.documentElement.style.setProperty('--accent', color);
const applyFont = (font: string) => typeof document !== 'undefined' && document.documentElement.style.setProperty('--font-sans', font);
const applyRadius = (radius: number) => typeof document !== 'undefined' && document.documentElement.style.setProperty('--radius', `${radius}rem`);
const applyFontSize = (size: number) => typeof document !== 'undefined' && document.documentElement.style.setProperty('--app-font-size', `${size}px`);
const applyShadowStrength = (strength: number) => typeof document !== 'undefined' && document.documentElement.style.setProperty('--shadow-strength', strength.toString());
const applyGlassBlur = (blur: number) => typeof document !== 'undefined' && document.documentElement.style.setProperty('--glass-blur', `${blur}px`);
const applyGlassOpacity = (opacity: number) => typeof document !== 'undefined' && document.documentElement.style.setProperty('--glass-opacity', opacity.toString());

let themeMediaQueryCleanup: (() => void) | null = null;

/**
 * Generates a tailored dark theme palette for single-mode light presets
 * so each theme has a distinct, beautiful dark mode background and surface
 * corresponding to its visual identity instead of falling back to blue.
 */
const deriveDarkThemeFromPreset = (preset: (typeof THEME_PRESETS)[0]) => {
  const accent = preset.accent || (preset.colors && preset.colors[0]) || '#10b981';
  const category = (preset as any).category || 'classic';

  if (category === 'beige') {
    return {
      '--app-bg': '#120d09',
      '--app-surface': '#1a130e',
      '--app-surface-hover': '#261d15',
      '--app-border': '#382b20',
      '--app-text': '#fdf6ed',
      '--app-text-secondary': '#d4a574',
      '--accent': accent,
    };
  }

  if (category === 'nature') {
    return {
      '--app-bg': '#04140c',
      '--app-surface': '#092215',
      '--app-surface-hover': '#0f3320',
      '--app-border': '#174d30',
      '--app-text': '#ecfdf5',
      '--app-text-secondary': '#6ee7b7',
      '--accent': accent,
    };
  }

  if (category === 'royal' || category === 'artistic') {
    return {
      '--app-bg': '#0d071a',
      '--app-surface': '#170d2c',
      '--app-surface-hover': '#241544',
      '--app-border': '#362066',
      '--app-text': '#faf5ff',
      '--app-text-secondary': '#c084fc',
      '--accent': accent,
    };
  }

  if (category === 'bold' || category === 'seasonal') {
    return {
      '--app-bg': '#13080a',
      '--app-surface': '#1f0d11',
      '--app-surface-hover': '#2f141a',
      '--app-border': '#441e26',
      '--app-text': '#fff1f2',
      '--app-text-secondary': '#fb7185',
      '--accent': accent,
    };
  }

  // Universal Deep Charcoal OLED Dark for classic, corporate, accounting and others
  return {
    '--app-bg': '#09090b',
    '--app-surface': '#141417',
    '--app-surface-hover': '#1f1f24',
    '--app-border': '#27272a',
    '--app-text': '#fafafa',
    '--app-text-secondary': '#a1a1aa',
    '--accent': accent,
  };
};

// تطبيق CSS variables الخاصة بالثيم على DOM
const applyPresetCSSVars = (presetId: string, currentTheme: 'light' | 'dark') => {
  if (typeof document === 'undefined') return;

  const preset = THEME_PRESETS.find(p => p.id === presetId);
  if (!preset) return;

  const root = document.documentElement;
  
  if (preset.light && preset.dark) {
    // اختيار المتغيرات بناءً على الوضع الحالي للباقات التي تدعم كلا الوضعين
    const vars = currentTheme === 'dark' ? preset.dark : preset.light;
    Object.entries(vars).forEach(([prop, value]) => {
      root.style.setProperty(prop, value);
    });
  } else if (preset.isDark) {
    // للباقات المخصصة للوضع الليلي
    if (currentTheme === 'dark') {
      Object.entries(preset.cssVars).forEach(([prop, value]) => {
        root.style.setProperty(prop, value);
      });
    } else {
      // وضع نهاري أنيق للباقات الليلية عند التحويل للنهاري مع الحفاظ على لون التمييز
      const accent = preset.accent || '#10b981';
      root.style.setProperty('--app-bg', '#f8fafc');
      root.style.setProperty('--app-surface', '#ffffff');
      root.style.setProperty('--app-surface-hover', '#f1f5f9');
      root.style.setProperty('--app-border', '#e2e8f0');
      root.style.setProperty('--app-text', '#0f172a');
      root.style.setProperty('--app-text-secondary', '#475569');
      root.style.setProperty('--accent', accent);
    }
  } else {
    // للباقات النهارية
    if (currentTheme === 'light') {
      Object.entries(preset.cssVars).forEach(([prop, value]) => {
        root.style.setProperty(prop, value);
      });
    } else {
      // تطبيق درجات ليلية متناسقة مع طبيعة وألوان الثيم المختار
      const darkVars = deriveDarkThemeFromPreset(preset);
      Object.entries(darkVars).forEach(([prop, value]) => {
        root.style.setProperty(prop, value);
      });
    }
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      theme: 'light',
      activePresetId: 'clean-white',
      accentColor: '#10b981',
      font: 'Cairo',
      radius: 0.5,
      fontSize: 14,
      shadowStrength: 0.05,
      glassBlur: 10,
      glassOpacity: 0.1,
      draftSettings: {
        accentColor: '#10b981',
        font: 'Cairo',
        radius: 0.5,
        fontSize: 14,
        shadowStrength: 0.05,
        glassBlur: 10,
        glassOpacity: 0.1,
      },

      initializeTheme: () => {
        const { mode, accentColor, font, radius, fontSize, shadowStrength, glassBlur, glassOpacity, activePresetId } = get();

        const initialTheme = applyTheme(mode);
        // تطبيق CSS variables الثيم المحفوظ مع مراعاة الوضع الحالي
        applyPresetCSSVars(activePresetId, initialTheme);
        // تطبيق الإعدادات المحفوظة
        applyAccent(accentColor);
        applyFont(font);
        applyRadius(radius);
        applyFontSize(fontSize);
        applyShadowStrength(shadowStrength);
        applyGlassBlur(glassBlur);
        applyGlassOpacity(glassOpacity);

        set({
          theme: initialTheme,
          draftSettings: { accentColor, font, radius, fontSize, shadowStrength, glassBlur, glassOpacity }
        });

        themeMediaQueryCleanup?.();

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleThemeChange = (e: MediaQueryListEvent) => {
          if (get().mode === 'system') {
            const newTheme = e.matches ? 'dark' : 'light';
            document.documentElement.classList.toggle('dark', e.matches);
            applyPresetCSSVars(get().activePresetId, newTheme);
            applyAccent(get().accentColor);
            set({ theme: newTheme });
          }
        };

        mediaQuery.addEventListener('change', handleThemeChange);
        themeMediaQueryCleanup = () => mediaQuery.removeEventListener('change', handleThemeChange);
      },

      setMode: (mode) => {
        const newTheme = applyTheme(mode);
        applyPresetCSSVars(get().activePresetId, newTheme);
        applyAccent(get().accentColor);
        set({ mode, theme: newTheme });
      },

      // تطبيق الثيم فعلياً مع جميع CSS variables
      setPreset: (id) => {
        const preset = THEME_PRESETS.find(p => p.id === id);
        if (!preset) return;

        // تطبيق الوضع (نهاري/ليلي) تلقائياً للباقات القديمة، أو الحفاظ على الوضع الحالي للجديدة
        const isProTheme = !!(preset.light || preset.dark);

        const newTheme = applyTheme(isProTheme ? get().mode : (preset.isDark ? 'dark' : 'light'));

        // تطبيق CSS variables
        applyPresetCSSVars(id, newTheme);

        // استخراج وتطبيق لون accent المناسب للوضع الحالي
        const resolvedAccent = isProTheme
          ? (newTheme === 'dark' ? preset.dark?.['--accent'] : preset.light?.['--accent']) || preset.accent || '#10b981'
          : preset.accent || '#10b981';

        applyAccent(resolvedAccent);

        const nextMode = isProTheme ? get().mode : (preset.isDark ? 'dark' : 'light');

        set({
          activePresetId: id,
          mode: nextMode,
          theme: newTheme,
          accentColor: resolvedAccent,
          draftSettings: { ...get().draftSettings, accentColor: resolvedAccent }
        });
      },

      setDraftAccentColor: (color) => {
        applyAccent(color);
        set(state => ({ draftSettings: { ...state.draftSettings, accentColor: color } }));
      },
      setDraftFont: (font) => {
        applyFont(font);
        set(state => ({ draftSettings: { ...state.draftSettings, font } }));
      },
      setDraftRadius: (radius) => {
        applyRadius(radius);
        set(state => ({ draftSettings: { ...state.draftSettings, radius } }));
      },
      setDraftFontSize: (size) => {
        applyFontSize(size);
        set(state => ({ draftSettings: { ...state.draftSettings, fontSize: size } }));
      },
      setDraftShadowStrength: (strength) => {
        applyShadowStrength(strength);
        set(state => ({ draftSettings: { ...state.draftSettings, shadowStrength: strength } }));
      },
      setDraftGlassBlur: (blur) => {
        applyGlassBlur(blur);
        set(state => ({ draftSettings: { ...state.draftSettings, glassBlur: blur } }));
      },
      setDraftGlassOpacity: (opacity) => {
        applyGlassOpacity(opacity);
        set(state => ({ draftSettings: { ...state.draftSettings, glassOpacity: opacity } }));
      },

      saveAppearanceSettings: () => {
        const { draftSettings } = get();
        set({
          accentColor: draftSettings.accentColor,
          font: draftSettings.font,
          radius: draftSettings.radius,
          fontSize: draftSettings.fontSize,
          shadowStrength: draftSettings.shadowStrength,
          glassBlur: draftSettings.glassBlur,
          glassOpacity: draftSettings.glassOpacity,
        });
      },

      revertAppearanceSettings: () => {
        const { accentColor, font, radius, fontSize, shadowStrength, glassBlur, glassOpacity } = get();
        applyAccent(accentColor);
        applyFont(font);
        applyRadius(radius);
        applyFontSize(fontSize);
        applyShadowStrength(shadowStrength);
        applyGlassBlur(glassBlur);
        applyGlassOpacity(glassOpacity);
        set({
          draftSettings: { accentColor, font, radius, fontSize, shadowStrength, glassBlur, glassOpacity }
        });
      },

      toggleTheme: () => {
        const { theme, accentColor } = get();
        const newMode = theme === 'light' ? 'dark' : 'light';
        const newTheme = applyTheme(newMode as ThemeMode);
        applyPresetCSSVars(get().activePresetId, newTheme);
        applyAccent(accentColor);
        set({ mode: newMode, theme: newTheme });
      },
    }),
    {
      name: 'al-zahra-appearance-storage',
      partialize: (state) => ({
        mode: state.mode,
        activePresetId: state.activePresetId,
        accentColor: state.accentColor,
        font: state.font,
        radius: state.radius,
        fontSize: state.fontSize,
        shadowStrength: state.shadowStrength,
        glassBlur: state.glassBlur,
        glassOpacity: state.glassOpacity,
      }),
      onRehydrateStorage: (persistedState) => {
        if (persistedState) {
          const theme = applyTheme(persistedState.mode);
          applyAccent(persistedState.accentColor);
          applyFont(persistedState.font);
          applyRadius(persistedState.radius);
          applyFontSize(persistedState.fontSize);
          applyShadowStrength(persistedState.shadowStrength);
          applyGlassBlur(persistedState.glassBlur);
          applyGlassOpacity(persistedState.glassOpacity);
          // تطبيق CSS variables الثيم المحفوظ عند تحميل الصفحة مع مراعاة الوضع
          applyPresetCSSVars(persistedState.activePresetId, theme);
        }
      },
    }
  )
);
