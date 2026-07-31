// ============================================
// AdvancedTabBar Component - Interactive Tab Navigation
// ============================================

import React, { useMemo } from 'react';
import { cn } from '../../../core/utils';
import { useAdvancedTabs } from './useAdvancedTabs';
import { AdvancedTabBarProps, TabItem } from './types';
import './styles.css';

// ============================================
// Individual Tab Component
// ============================================

interface TabButtonProps {
    tab: TabItem;
    isActive: boolean;
    isFocused: boolean;
    isDragging: boolean;
    isDropTarget: boolean;
    size: 'sm' | 'md' | 'lg' | 'micro';
    onClick: () => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onFocus: () => void;
    onBlur: () => void;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    ariaAttributes: {
        role: 'tab';
        'aria-selected': boolean;
        'aria-disabled': boolean | undefined;
        'aria-controls': string;
        'aria-label': string | undefined;
        tabIndex: number;
    };
    setRef: (el: HTMLButtonElement | null) => void;
}

const TabButton: React.FC<TabButtonProps> = ({
    tab,
    isActive,

    isDragging,
    isDropTarget,
    size,
    onClick,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDragLeave,
    onDrop,
    ariaAttributes,
    setRef,
}) => {
    const Icon = tab.icon;

    // Determine badge color
    const badgeClasses = useMemo(() => {
        const baseClasses = 'advanced-tab__badge';
        if (isActive) return baseClasses;

        const colorMap = {
            primary: 'bg-blue-500',
            success: 'bg-green-500',
            warning: 'bg-yellow-500',
            danger: 'bg-red-500',
            info: 'bg-cyan-500',
        };

        return cn(baseClasses, tab.badgeColor && colorMap[tab.badgeColor]);
    }, [isActive, tab.badgeColor]);

    return (
        <button
            ref={setRef}
            type="button"
            className={cn(
                'advanced-tab',
                isActive && 'advanced-tab--active',
                isDragging && 'advanced-tab--dragging',
                isDropTarget && 'advanced-tab--drop-target',
                size === 'micro' && 'advanced-tab--micro',
                size === 'sm' && 'advanced-tab--sm',
                size === 'lg' && 'advanced-tab--lg'
            )}
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onFocus={onFocus}
            onBlur={onBlur}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            disabled={tab.disabled}
            draggable={!tab.disabled}
            id={`tab-${tab.id}`}
            {...ariaAttributes}
            title={tab.tooltip}
        >
            {/* Icon */}
            {Icon && (
                <Icon
                    className="advanced-tab__icon"
                    aria-hidden="true"
                />
            )}

            {/* Label */}
            <span className="advanced-tab__label">
                {tab.label}
            </span>

            {/* Badge */}
            {tab.badge !== undefined && tab.badge !== null && (
                <span className={badgeClasses} aria-label={`${tab.badge} items`}>
                    {typeof tab.badge === 'number' && tab.badge > 99
                        ? '99+'
                        : tab.badge}
                </span>
            )}
        </button>
    );
};

// ============================================
// Main AdvancedTabBar Component
// ============================================

export const AdvancedTabBar: React.FC<AdvancedTabBarProps> = ({
    tabs: initialTabs,
    activeTab,
    onTabChange,
    onTabsReorder,
    animation = {},
    gradient = {},
    a11y = {},
    enableDragDrop = false,
    enableKeyboardNav = true,
    className,
    size = 'md' as 'sm' | 'md' | 'lg' | 'micro',
    theme = 'auto',
}) => {
    // Use the advanced tabs hook
    const {
        tabs,
        activeTabId,
        focusedTabId,
        dragState,
        indicatorPosition,
        containerRef,
        handleTabClick,
        handleTabMouseEnter,
        handleTabMouseLeave,
        handleTabFocus,
        handleTabBlur,
        handleKeyDown,
        handleDragStart,
        handleDragEnd,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        setTabRef,
        animationConfig,
        a11yConfig,
        getTabAttributes,
    } = useAdvancedTabs({
        tabs: initialTabs,
        activeTab,
        onTabChange,
        onTabsReorder,
        animation,
        gradient,
        a11y,
        enableDragDrop,
        enableKeyboardNav,
        theme,
    });

    // Calculate container classes
    const containerClasses = useMemo(() => cn(
        'advanced-tab-bar',
        `advanced-tab-bar--${size}`,
        animationConfig.enable3D && 'advanced-tab-bar--3d',
        className
    ), [size, animationConfig.enable3D, className]);

    // Get indicator style for sliding effect
    const indicatorStyle = useMemo(() => {
        const rtl = document.documentElement.dir === 'rtl' ||
            document.documentElement.getAttribute('dir') === 'rtl';

        return {
            [rtl ? 'right' : 'left']: `${indicatorPosition.x}px`,
            width: `${indicatorPosition.width}px`,
            opacity: indicatorPosition.opacity,
            transitionDuration: `${animationConfig.transitionDuration}ms`,
            transitionTimingFunction: animationConfig.easing,
        };
    }, [indicatorPosition, animationConfig]);

    // Handle container key down
    const onContainerKeyDown = (event: React.KeyboardEvent) => {
        handleKeyDown(event);
    };

    // If no tabs, return null
    if (tabs.length === 0) {
        return null;
    }

    return (
        <div
            className={containerClasses}
            ref={containerRef}
            onKeyDown={onContainerKeyDown}
            role="tablist"
            aria-label={a11yConfig.ariaLabel}
        >
            <div className="advanced-tab-bar__container">
                {/* Drop Indicator */}
                <div
                    className={cn(
                        'advanced-tab-bar__drop-indicator',
                        dragState.dropTargetId && 'advanced-tab-bar__drop-indicator--visible'
                    )}
                    style={{
                        left: dragState.dropTargetId ?
                            `${indicatorPosition.x + indicatorPosition.width}px` : '0',
                    }}
                />

                {/* Tabs */}
                {tabs.map((tab, index) => {
                    const isActive = tab.id === activeTabId;
                    const isFocused = tab.id === focusedTabId;
                    const isDragging = dragState.draggedTabId === tab.id;
                    const isDropTarget = dragState.dropTargetId === tab.id;

                    return (
                        <TabButton
                            key={tab.id}
                            tab={tab}
                            isActive={isActive}
                            isFocused={isFocused}
                            isDragging={isDragging}
                            isDropTarget={isDropTarget}
                            size={size}
                            onClick={() => handleTabClick(tab.id)}
                            onMouseEnter={() => handleTabMouseEnter(tab.id)}
                            onMouseLeave={handleTabMouseLeave}
                            onFocus={() => handleTabFocus(tab.id)}
                            onBlur={handleTabBlur}
                            onDragStart={(e) => handleDragStart(e, tab.id)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleDragOver(e, tab.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, tab.id)}
                            ariaAttributes={getTabAttributes(tab.id, index)}
                            setRef={setTabRef(tab.id)}
                        />
                    );
                })}
            </div>

            {/* Sliding Indicator (Optional - below tabs) */}
            <div
                className={cn(
                    'advanced-tab-indicator',
                    indicatorPosition.opacity > 0 && 'advanced-tab-indicator--visible'
                )}
                style={indicatorStyle}
                aria-hidden="true"
            />
        </div>
    );
};

// ============================================
// Named Export
// ============================================

export default AdvancedTabBar;

// ============================================
// Re-export types
// ============================================

export type { AdvancedTabBarProps, TabItem } from './types';
