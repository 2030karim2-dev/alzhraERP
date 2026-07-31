/**
 * Feature Flags Configuration
 * Alzhra Smart ERP
 * 
 * This file contains feature flags for gradual rollout of new features
 * and maintaining backward compatibility during migrations.
 */

import { CardMigrationFlags, FeatureFlagConfig } from '@/ui/cards/types';
// import { logger } from '../core/utils/logger';

// ======== Feature Flags ========

export const featureFlags = {
    // Card System V2 Migration
    enableV2Cards: {
        enabled: import.meta.env.VITE_V2_CARDS === 'true' || false,
        rolloutPercentage: 0, // Start with 0%, increase gradually
        allowedUsers: ['admin', 'beta-testers'],
    } as FeatureFlagConfig,

    // Migration stages - control which sections use the new card system
    cardMigration: {
        dashboard: import.meta.env.VITE_V2_DASHBOARD === 'true' || false,
        sales: import.meta.env.VITE_V2_SALES === 'true' || false,
        settings: import.meta.env.VITE_V2_SETTINGS === 'true' || false,
        inventory: import.meta.env.VITE_V2_INVENTORY === 'true' || false,
        reports: import.meta.env.VITE_V2_REPORTS === 'true' || false,
    } as CardMigrationFlags,

    // Animation preferences
    enableCardAnimations: {
        enabled: true,
        rolloutPercentage: 100,
    } as FeatureFlagConfig,

    // Glassmorphism effects
    enableGlassEffects: {
        enabled: true,
        rolloutPercentage: 100,
    } as FeatureFlagConfig,
};

// ======== Helper Functions ========

/**
 * Check if a feature flag is enabled
 */
export const isFeatureEnabled = (flag: keyof typeof featureFlags): boolean => {
    const config = featureFlags[flag];

    if (typeof config === 'boolean') {
        return config;
    }

    if ('enabled' in config) {
        return config.enabled;
    }

    return false;
};

/**
 * Check if card migration is enabled for a specific section
 */
export const isCardMigrationEnabled = (section: keyof CardMigrationFlags): boolean => {
    return featureFlags.cardMigration[section] || false;
};

/**
 * Check if user is allowed to use a feature
 */
export const isUserAllowed = (
    flag: keyof typeof featureFlags,
    userRole?: string
): boolean => {
    const config = featureFlags[flag];

    if (typeof config === 'object' && 'allowedUsers' in config) {
        if (config.allowedUsers && userRole) {
            return config.allowedUsers.includes(userRole);
        }
    }

    return isFeatureEnabled(flag);
};

/**
 * Get rollout percentage for a feature
 */
export const getRolloutPercentage = (flag: keyof typeof featureFlags): number => {
    const config = featureFlags[flag];

    if (typeof config === 'object' && 'rolloutPercentage' in config) {
        return config.rolloutPercentage;
    }

    return 0;
};

// ======== React Hook ========

import { useMemo } from 'react';

/**
 * React hook for checking feature flags
 */
export const useFeatureFlag = (flag: keyof typeof featureFlags): boolean => {
    return useMemo(() => isFeatureEnabled(flag), [flag]);
};

/**
 * React hook for checking card migration status
 */
export const useCardMigration = (section: keyof CardMigrationFlags): boolean => {
    return useMemo(() => isCardMigrationEnabled(section), [section]);
};

// ======== Environment Variable Helpers ========

/**
 * Get all feature flags as an object for debugging
 */
export const getAllFeatureFlags = () => {
    return {
        ...featureFlags,
        environment: import.meta.env.MODE,
        timestamp: new Date().toISOString(),
    };
};

// ======== Development Helpers ========

if (import.meta.env.DEV) {
    // Expose feature flags to window for debugging
    (window as any).featureFlags = featureFlags;
    (window as any).getAllFeatureFlags = getAllFeatureFlags;

    console.info('[Feature Flags] Initialized:', getAllFeatureFlags());
}
