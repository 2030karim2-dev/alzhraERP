/**
 * Card System - Type Definitions
 * Alzhra Smart ERP - Card Design System v2.0
 */

import React from 'react';

// ======== Core Types ========

export type CardSize = 'sm' | 'md' | 'lg' | 'xl';

export type CardVariant =
    | 'default'
    | 'primary'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'violet'
    | 'gradient';

export type CardState =
    | 'default'
    | 'hover'
    | 'active'
    | 'loading'
    | 'disabled'
    | 'selected';

export type CardElevation = 'flat' | 'raised' | 'floating' | 'glow';

export type CardBorder = 'none' | 'subtle' | 'default' | 'emphasized';

// ============= Animation Types ========

export interface CardAnimationConfig {
    initial?: object;
    animate?: object;
    exit?: object;
    whileHover?: object;
    whileTap?: object;
    transition?: {
        type?: 'spring' | 'tween';
        stiffness?: number;
        damping?: number;
        duration?: number;
    };
}

// ======== Style Configuration Types ========

export interface CardVariantConfig {
    background: string;
    border: string;
    text: string;
    textSecondary: string;
    shadow: string;
    gradient?: string;
    glow?: string;
}

export interface CardSizeConfig {
    padding: string;
    radius: string;
    gap: string;
    headerPadding: string;
    footerPadding: string;
}

export interface GlassConfig {
    background: string;
    backdrop: string;
    border: string;
    shadow: string;
}

// ======== Base Card Props ========

export interface BaseCardProps {
    children: React.ReactNode;
    size?: CardSize;
    variant?: CardVariant;
    interactive?: boolean;
    loading?: boolean;
    disabled?: boolean;
    selected?: boolean;
    elevation?: CardElevation;
    border?: CardBorder;
    glass?: boolean;
    gradient?: boolean;
    glow?: boolean;
    header?: React.ReactNode;
    footer?: React.ReactNode;
    media?: React.ReactNode;
    animate?: boolean;
    animationConfig?: CardAnimationConfig;
    onClick?: () => void;
    onHover?: () => void;
    onFocus?: () => void;
    className?: string;
    style?: React.CSSProperties;
    role?: string;
    ariaLabel?: string;
    ariaDescribedBy?: string;
}

// ======== Specialized Card Props ========

export interface MetricCardProps extends Omit<BaseCardProps, 'children'> {
    title: string;
    value: string | number;
    previousValue?: string | number;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: number;
    icon: React.ComponentType<{ className?: string; size?: number }>;
    color: CardVariant;
    sparklineData?: number[];
    formatValue?: (value: number) => string;
    subtitle?: string;
}

export interface ChartCardProps extends BaseCardProps {
    title: string;
    subtitle?: string;
    timeRange?: string;
    timeRanges?: string[];
    onTimeRangeChange?: (range: string) => void;
    action?: {
        label: string;
        icon?: React.ComponentType<{ className?: string; size?: number }>;
        onClick: () => void;
    };
    chart: React.ReactNode;
    legend?: Array<{ color: string; label: string }>;
}

export interface ActionCardProps extends BaseCardProps {
    title: string;
    description?: string;
    icon: React.ComponentType<{ className?: string; size?: number }>;
    color: CardVariant;
    onClick: () => void;
    shortcut?: string;
    badge?: string | number;
    badgeColor?: CardVariant;
}

export interface AlertCardProps extends BaseCardProps {
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message?: string;
    icon?: React.ComponentType<{ className?: string; size?: number }>;
    actions?: Array<{
        label: string;
        variant?: 'primary' | 'secondary' | 'ghost';
        onClick: () => void;
    }>;
    dismissible?: boolean;
    onDismiss?: () => void;
    autoClose?: number;
}

export interface DataCardProps extends BaseCardProps {
    entity: {
        id: string;
        title: string;
        subtitle?: string;
        image?: string;
        status?: 'active' | 'inactive' | 'pending' | 'error';
        metadata?: Array<{ label: string; value: string }>;
    };
    actions?: Array<{
        icon: React.ComponentType<{ className?: string; size?: number }>;
        label: string;
        onClick: () => void;
        variant?: 'primary' | 'danger' | 'ghost';
    }>;
    selectable?: boolean;
    selected?: boolean;
    onSelect?: (id: string) => void;
}

// ======== Feature Flag Types ========

export interface FeatureFlagConfig {
    enabled: boolean;
    rolloutPercentage: number;
    allowedUsers?: string[];
}

export interface CardMigrationFlags {
    dashboard: boolean;
    sales: boolean;
    settings: boolean;
    inventory: boolean;
    reports: boolean;
}
