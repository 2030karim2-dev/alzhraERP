/**
 * Card System - Exports
 * Alzhra Smart ERP - Card Design System v2.0
 */

// Types
export type {
    CardSize,
    CardVariant,
    CardState,
    CardElevation,
    CardBorder,
    CardAnimationConfig,
    BaseCardProps,
    MetricCardProps,
    ChartCardProps,
    ActionCardProps,
    AlertCardProps,
    DataCardProps,
    FeatureFlagConfig,
    CardMigrationFlags,
} from './types';

// Constants
export {
    CARD_SIZES,
    CARD_VARIANTS,
    CARD_ELEVATIONS,
    CARD_BORDERS,
    GLASS_PRESETS,
    GRADIENT_PRESETS,
    SHADOW_SYSTEM,
    ANIMATION_DURATION,
    HOVER_EFFECTS,
} from './constants';

// Animations
export {
    cardEntranceVariants,
    cardHoverVariants,
    cardLoadingVariants,
    cardContainerVariants,
    cardItemVariants,
    sparklineVariants,
    alertCardVariants,
    countUpTransition,
    rippleVariants,
    fadeInVariants,
    scaleVariants,
    slideUpVariants,
    slideDownVariants,
    iconHoverVariants,
    progressBarVariants,
    skeletonVariants,
    pulseVariants,
    badgeVariants,
    glassShimmerVariants,
    numberCounterConfig,
} from './animations';

// Components
export { Card } from './Card';

// Default export
export { default } from './Card';
