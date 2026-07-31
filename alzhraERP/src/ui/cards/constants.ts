/**
 * Card System - Design Tokens & Constants
 * Alzhra Smart ERP - Card Design System v2.0
 */

import { CardVariantConfig, CardSizeConfig, GlassConfig } from './types';

// ======== Size Tokens ========

export const CARD_SIZES: Record<string, CardSizeConfig> = {
    sm: {
        padding: 'p-3',
        radius: 'rounded-xl',
        gap: 'gap-2',
        headerPadding: 'pb-2 mb-2',
        footerPadding: 'pt-2 mt-2',
    },
    md: {
        padding: 'p-4',
        radius: 'rounded-2xl',
        gap: 'gap-3',
        headerPadding: 'pb-3 mb-3',
        footerPadding: 'pt-3 mt-3',
    },
    lg: {
        padding: 'p-5',
        radius: 'rounded-2xl',
        gap: 'gap-4',
        headerPadding: 'pb-4 mb-4',
        footerPadding: 'pt-4 mt-4',
    },
    xl: {
        padding: 'p-6',
        radius: 'rounded-3xl',
        gap: 'gap-5',
        headerPadding: 'pb-5 mb-5',
        footerPadding: 'pt-5 mt-5',
    },
};

// ======== Color Variants ========

export const CARD_VARIANTS: Record<string, CardVariantConfig> = {
    default: {
        background: 'bg-[var(--app-surface)]',
        border: 'border-[var(--app-border)]',
        text: 'text-[var(--app-text)]',
        textSecondary: 'text-[var(--app-text-secondary)]',
        shadow: 'shadow-sm',
    },
    primary: {
        background: 'bg-blue-500/5 dark:bg-blue-500/10',
        border: 'border-blue-500/20 dark:border-blue-400/20',
        text: 'text-blue-700 dark:text-blue-300',
        textSecondary: 'text-blue-600/70 dark:text-blue-400/70',
        shadow: 'shadow-[0_4px_20px_-5px_rgba(59,130,246,0.15)]',
        gradient: 'from-blue-500/10 to-blue-600/5',
        glow: 'shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)]',
    },
    success: {
        background: 'bg-emerald-500/5 dark:bg-emerald-500/10',
        border: 'border-emerald-500/20 dark:border-emerald-400/20',
        text: 'text-emerald-700 dark:text-emerald-300',
        textSecondary: 'text-emerald-600/70 dark:text-emerald-400/70',
        shadow: 'shadow-[0_4px_20px_-5px_rgba(16,185,129,0.15)]',
        gradient: 'from-emerald-500/10 to-emerald-600/5',
        glow: 'shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)]',
    },
    warning: {
        background: 'bg-amber-500/5 dark:bg-amber-500/10',
        border: 'border-amber-500/20 dark:border-amber-400/20',
        text: 'text-amber-700 dark:text-amber-300',
        textSecondary: 'text-amber-600/70 dark:text-amber-400/70',
        shadow: 'shadow-[0_4px_20px_-5px_rgba(245,158,11,0.15)]',
        gradient: 'from-amber-500/10 to-orange-500/5',
        glow: 'shadow-[0_0_30px_-5px_rgba(245,158,11,0.3)]',
    },
    danger: {
        background: 'bg-rose-500/5 dark:bg-rose-500/10',
        border: 'border-rose-500/20 dark:border-rose-400/20',
        text: 'text-rose-700 dark:text-rose-300',
        textSecondary: 'text-rose-600/70 dark:text-rose-400/70',
        shadow: 'shadow-[0_4px_20px_-5px_rgba(244,63,94,0.15)]',
        gradient: 'from-rose-500/10 to-red-500/5',
        glow: 'shadow-[0_0_30px_-5px_rgba(244,63,94,0.3)]',
    },
    info: {
        background: 'bg-violet-500/5 dark:bg-violet-500/10',
        border: 'border-violet-500/20 dark:border-violet-400/20',
        text: 'text-violet-700 dark:text-violet-300',
        textSecondary: 'text-violet-600/70 dark:text-violet-400/70',
        shadow: 'shadow-[0_4px_20px_-5px_rgba(139,92,246,0.15)]',
        gradient: 'from-violet-500/10 to-purple-500/5',
        glow: 'shadow-[0_0_30px_-5px_rgba(139,92,246,0.3)]',
    },
    violet: {
        background: 'bg-gradient-to-br from-violet-500 to-purple-600',
        border: 'border-transparent',
        text: 'text-white',
        textSecondary: 'text-white/80',
        shadow: 'shadow-[0_10px_30px_-5px_rgba(139,92,246,0.4)]',
        gradient: 'from-violet-500 to-purple-600',
        glow: 'shadow-[0_0_40px_-5px_rgba(139,92,246,0.5)]',
    },
    gradient: {
        background: 'bg-gradient-to-br from-blue-500 to-violet-600',
        border: 'border-transparent',
        text: 'text-white',
        textSecondary: 'text-white/80',
        shadow: 'shadow-[0_10px_30px_-5px_rgba(59,130,246,0.4)]',
        gradient: 'from-blue-500 via-blue-600 to-violet-600',
        glow: 'shadow-[0_0_40px_-5px_rgba(59,130,246,0.5)]',
    },
};

// ======== Elevation System ========

export const CARD_ELEVATIONS = {
    flat: {
        shadow: 'shadow-none',
        transform: 'translate-y-0',
    },
    raised: {
        shadow: 'shadow-[0_4px_16px_-4px_rgba(0,0,0,0.08)]',
        transform: 'translate-y-0',
    },
    floating: {
        shadow: 'shadow-[0_8px_30px_-6px_rgba(0,0,0,0.12)]',
        transform: 'translate-y-0',
    },
    glow: {
        shadow: 'shadow-[0_0_40px_-10px_var(--glow-color)]',
        transform: 'translate-y-0',
    },
};

// ======== Border System ========

export const CARD_BORDERS = {
    none: 'border-0',
    subtle: 'border border-white/10 dark:border-white/5',
    default: 'border border-[var(--app-border)]',
    emphasized: 'border-2 border-[var(--app-border)]',
};

// ======== Glassmorphism Presets ========

export const GLASS_PRESETS: Record<string, GlassConfig> = {
    light: {
        background: 'bg-white/70 dark:bg-white/10',
        backdrop: 'backdrop-blur-xl',
        border: 'border border-white/30 dark:border-white/10',
        shadow: 'shadow-[0_8px_32px_0_rgba(0,0,0,0.08)]',
    },
    dark: {
        background: 'bg-black/20 dark:bg-black/40',
        backdrop: 'backdrop-blur-xl',
        border: 'border border-white/10 dark:border-white/5',
        shadow: 'shadow-[0_8px_32px_0_rgba(0,0,0,0.2)]',
    },
};

// ======== Gradient Presets ========

export const GRADIENT_PRESETS = {
    primary: 'from-blue-500 via-blue-600 to-indigo-600',
    success: 'from-emerald-400 via-emerald-500 to-emerald-600',
    warning: 'from-amber-400 via-amber-500 to-orange-500',
    danger: 'from-rose-400 via-rose-500 to-red-600',
    info: 'from-cyan-400 via-cyan-500 to-blue-500',
    violet: 'from-violet-400 via-violet-500 to-purple-600',
    sunset: 'from-orange-400 via-pink-500 to-rose-500',
    ocean: 'from-blue-400 via-cyan-500 to-teal-500',
    midnight: 'from-slate-700 via-slate-800 to-slate-900',
};

// ======== Shadow System ========

export const SHADOW_SYSTEM = {
    sm: 'shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)]',
    md: 'shadow-[0_4px_16px_-4px_rgba(0,0,0,0.1)]',
    lg: 'shadow-[0_8px_24px_-6px_rgba(0,0,0,0.12)]',
    xl: 'shadow-[0_16px_48px_-8px_rgba(0,0,0,0.15)]',
};

// ======== Animation Durations ========

export const ANIMATION_DURATION = {
    fast: 0.15,
    normal: 0.3,
    slow: 0.5,
    slower: 0.8,
};

// ======== Hover Effects ========

export const HOVER_EFFECTS = {
    lift: 'hover:-translate-y-1 hover:shadow-lg transition-all duration-300',
    glow: 'hover:shadow-[0_0_20px_-5px_rgba(59,130,246,0.4)] transition-all duration-300',
    scale: 'hover:scale-[1.02] transition-transform duration-200',
    border: 'hover:border-blue-500/50 transition-colors duration-200',
    gradient: 'hover:bg-gradient-to-br hover:from-blue-500/10 hover:to-violet-500/10 transition-all duration-300',
};
