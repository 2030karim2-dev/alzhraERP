/**
 * Card Component - Base Card for Card Design System v2.0
 * Alzhra Smart ERP
 * 
 * Features:
 * - 4 sizes: sm, md, lg, xl
 * - 8 variants: default, primary, success, warning, danger, info, violet, gradient
 * - Interactive states: hover, active, loading, disabled
 * - Visual effects: glass, gradient, glow
 * - Full dark mode support
 * - Accessibility support
 */

import React from 'react';
import { cn } from '@/core/utils';
import { Loader2 } from 'lucide-react';
import { BaseCardProps } from './types';
import { CARD_SIZES, CARD_VARIANTS, CARD_ELEVATIONS, CARD_BORDERS, GLASS_PRESETS } from './constants';

export const Card: React.FC<BaseCardProps> = ({
    children,
    size = 'md',
    variant = 'default',
    interactive = false,
    loading = false,
    disabled = false,
    selected = false,
    elevation = 'raised',
    border = 'default',
    glass = false,
    gradient = false,
    glow = false,
    header,
    footer,
    media,
    onClick,
    className,
    style,
    role,
    ariaLabel,
    ariaDescribedBy,
    ...props
}) => {
    const sizeConfig = CARD_SIZES[size];
    const variantConfig = CARD_VARIANTS[variant];
    const elevationConfig = CARD_ELEVATIONS[elevation];
    const borderConfig = CARD_BORDERS[border];
    const glassConfig = GLASS_PRESETS.light;

    const isClickable = interactive && !disabled && !loading;

    return (
        <div
            className={cn(
                // Base styles
                'relative overflow-hidden transition-all duration-300 ease-out',
                sizeConfig.padding,
                sizeConfig.radius,
                borderConfig,

                // Variant styles
                !glass && !gradient && variantConfig.background,
                !glass && !gradient && variantConfig.border,
                variant === 'gradient' && 'bg-gradient-to-br',
                variant === 'gradient' && variantConfig.gradient,

                // Glass effect
                glass && glassConfig.background,
                glass && glassConfig.backdrop,
                glass && glassConfig.border,

                // Elevation & Shadow
                elevation === 'glow' && variantConfig.glow,
                elevation !== 'glow' && elevationConfig.shadow,

                // Interactive states
                isClickable && 'cursor-pointer',
                isClickable && 'hover:shadow-lg hover:-translate-y-0.5',
                isClickable && 'active:scale-[0.99] active:shadow-md',

                // States
                loading && 'animate-pulse pointer-events-none',
                disabled && 'opacity-50 pointer-events-none grayscale',
                selected && 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[var(--app-bg)]',

                // Custom class
                className
            )}
            style={{
                ...style,
                ...(glow && variantConfig.glow ? { boxShadow: variantConfig.glow } : {}),
            }}
            onClick={isClickable ? onClick : undefined}
            role={role || (isClickable ? 'button' : undefined)}
            aria-label={ariaLabel}
            aria-describedby={ariaDescribedBy}
            aria-disabled={disabled}
            aria-busy={loading}
            tabIndex={isClickable ? 0 : undefined}
            {...props}
        >
            {/* Loading Overlay */}
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--app-surface)]/80 z-20 rounded-inherit">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
            )}

            {/* Media Section */}
            {media && (
                <div className={cn('relative overflow-hidden', sizeConfig.radius)}>
                    {media}
                </div>
            )}

            {/* Header Section */}
            {header && (
                <div className={cn(
                    'border-b border-[var(--app-border)]/50',
                    sizeConfig.headerPadding
                )}>
                    {header}
                </div>
            )}

            {/* Content Section */}
            <div className={cn('relative', loading && 'opacity-50')}>
                {children}
            </div>

            {/* Footer Section */}
            {footer && (
                <div className={cn(
                    'border-t border-[var(--app-border)]/50',
                    sizeConfig.footerPadding
                )}>
                    {footer}
                </div>
            )}

            {/* Gradient Overlay for gradient variant */}
            {gradient && variant === 'gradient' && (
                <div
                    className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%)',
                    }}
                />
            )}
        </div>
    );
};

export default Card;
