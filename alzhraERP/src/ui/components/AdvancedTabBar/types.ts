// ============================================
// AdvancedTabBar - TypeScript Interfaces
// ============================================

import { LucideIcon } from 'lucide-react';

/**
 * Individual tab item configuration
 */
export interface TabItem {
    id: string;
    label: string;
    icon: LucideIcon;
    badge?: number | string;
    badgeColor?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
    disabled?: boolean;
    tooltip?: string;
}

/**
 * Animation configuration options
 */
export interface AnimationConfig {
    /** Duration of transition animations in ms */
    transitionDuration: number;
    /** Easing function for animations */
    easing: string;
    /** Enable/disable 3D transforms */
    enable3D: boolean;
    /** Enable/disable glassmorphism effects */
    enableGlassmorphism: boolean;
    /** Enable rhythmic pulsing for active tab */
    enablePulsing: boolean;
    /** Enable multi-layered shadows */
    enableMultiLayerShadows: boolean;
}

/**
 * Color gradient configuration
 */
export interface GradientConfig {
    /** Primary gradient colors (start to end) */
    primaryGradient: [string, string];
    /** Hover state gradient colors */
    hoverGradient: [string, string];
    /** Active state gradient colors */
    activeGradient: [string, string];
    /** Ambient glow color */
    glowColor: string;
    /** Shadow color */
    shadowColor: string;
}

/**
 * Accessibility configuration
 */
export interface A11yConfig {
    /** ARIA label for the tablist */
    ariaLabel: string;
    /** Whether to announce tab changes */
    announceChanges: boolean;
    /** Custom announcement formatter */
    announcementFormatter?: (tabLabel: string) => string;
}

/**
 * Complete props interface for AdvancedTabBar
 */
export interface AdvancedTabBarProps {
    /** Array of tab items to display */
    tabs: TabItem[];
    /** Currently active tab ID */
    activeTab: string;
    /** Callback when tab changes */
    onTabChange: (tabId: string) => void;
    /** Callback when tabs are reordered via drag-drop */
    onTabsReorder?: ((tabs: TabItem[]) => void) | undefined;
    /** Animation configuration */
    animation?: Partial<AnimationConfig>;
    /** Gradient color configuration */
    gradient?: Partial<GradientConfig>;
    /** Accessibility configuration */
    a11y?: Partial<A11yConfig>;
    /** Enable drag-and-drop reordering */
    enableDragDrop?: boolean;
    /** Enable keyboard navigation */
    enableKeyboardNav?: boolean;
    /** Additional CSS class */
    className?: string;
    /** Tab size variant */
    size?: 'micro' | 'sm' | 'md' | 'lg';
    /** Theme mode override */
    theme?: 'light' | 'dark' | 'auto';
}

/**
 * Internal state for tab items with animation metadata
 */
export interface TabState {
    id: string;
    isActive: boolean;
    isHovered: boolean;
    isDragging: boolean;
    isDropTarget: boolean;
    isFocused: boolean;
    index: number;
}

/**
 * Sliding indicator position state
 */
export interface IndicatorState {
    x: number;
    width: number;
    height: number;
    opacity: number;
    scale: number;
}

/**
 * Drag and drop state
 */
export interface DragDropState {
    draggedId: string | null;
    dropTargetId: string | null;
    originalIndex: number;
    currentIndex: number;
}

/**
 * Keyboard navigation state
 */
export interface KeyboardNavState {
    focusedIndex: number;
    isTabbing: boolean;
}

/**
 * Default animation configuration
 */
export const DEFAULT_ANIMATION_CONFIG: AnimationConfig = {
    transitionDuration: 400,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    enable3D: true,
    enableGlassmorphism: true,
    enablePulsing: true,
    enableMultiLayerShadows: true,
};

/**
 * Default gradient configuration for light mode
 */
export const DEFAULT_LIGHT_GRADIENT: GradientConfig = {
    primaryGradient: ['#3b82f6', '#8b5cf6'],
    hoverGradient: ['#60a5fa', '#a78bfa'],
    activeGradient: ['#2563eb', '#7c3aed'],
    glowColor: 'rgba(59, 130, 246, 0.5)',
    shadowColor: 'rgba(59, 130, 246, 0.3)',
};

/**
 * Default gradient configuration for dark mode
 */
export const DEFAULT_DARK_GRADIENT: GradientConfig = {
    primaryGradient: ['#60a5fa', '#a78bfa'],
    hoverGradient: ['#93c5fd', '#c4b5fd'],
    activeGradient: ['#3b82f6', '#8b5cf6'],
    glowColor: 'rgba(96, 165, 250, 0.6)',
    shadowColor: 'rgba(96, 165, 250, 0.4)',
};

/**
 * Default accessibility configuration
 */
export const DEFAULT_A11Y_CONFIG: A11yConfig = {
    ariaLabel: 'Navigation tabs',
    announceChanges: true,
    announcementFormatter: (tabLabel) => `${tabLabel} tab selected`,
};
