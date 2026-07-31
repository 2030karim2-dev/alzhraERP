// ============================================
// AdvancedTabBar - Module Exports
// ============================================

// Main Component
export { AdvancedTabBar, default } from './AdvancedTabBar';

// Hook
export { useAdvancedTabs, default as useAdvancedTabsDefault } from './useAdvancedTabs';

// Types
export type {
    TabItem,
    AnimationConfig,
    GradientConfig,
    A11yConfig,
    AdvancedTabBarProps,
    TabState,
    IndicatorState,
    DragDropState,
    KeyboardNavState,
} from './types';

// Constants
export {
    DEFAULT_ANIMATION_CONFIG,
    DEFAULT_LIGHT_GRADIENT,
    DEFAULT_DARK_GRADIENT,
    DEFAULT_A11Y_CONFIG,
} from './types';

// Styles are imported automatically with the component
import './styles.css';
