interface SidebarWidthOptions {
    breakpoint: string;
    isIPad: boolean;
    isTabletLandscape: boolean;
}

interface MainLayoutOffsetOptions extends SidebarWidthOptions {
    dir: 'rtl' | 'ltr';
    isCollapsed: boolean;
}

const isUltraWideBreakpoint = (breakpoint: string) => breakpoint === '4xl' || breakpoint === '5xl';
const isWideDesktop = (breakpoint: string) => breakpoint === '3xl' || breakpoint === '4xl' || breakpoint === '5xl';

/**
 * هل يجب أن تكون القائمة الجانبية موسعة بشكل دائم؟
 * على الشاشات الكبيرة (1920px+)، القائمة تكون موسعة افتراضياً.
 */
export const shouldPersistExpandedSidebar = (breakpoint: string): boolean => {
    return isWideDesktop(breakpoint);
};

export const getCollapsedSidebarWidth = ({ breakpoint, isIPad, isTabletLandscape }: SidebarWidthOptions) => {
    if (breakpoint === '5xl') return 'w-40';
    if (breakpoint === '4xl') return 'w-36';
    if (breakpoint === '3xl') return 'w-32';
    if (breakpoint === '2xl') return 'w-28';
    if (isIPad && isTabletLandscape) return 'w-24';
    return 'w-20';
};

export const getExpandedSidebarWidth = ({ breakpoint, isIPad, isTabletLandscape }: SidebarWidthOptions) => {
    if (breakpoint === '5xl') return 'w-80';
    if (breakpoint === '4xl') return 'w-80';
    if (breakpoint === '3xl') return 'w-72';
    if (isIPad && isTabletLandscape) return 'w-64';
    return 'w-64';
};

export const getMainLayoutOffsetClasses = ({
    breakpoint,
    dir,
    isCollapsed,
    isIPad,
    isTabletLandscape,
}: MainLayoutOffsetOptions) => {
    const collapsedOffsets = {
        'w-20': dir === 'rtl' ? 'md:mr-20' : 'md:ml-20',
        'w-24': dir === 'rtl' ? 'md:mr-24' : 'md:ml-24',
        'w-28': dir === 'rtl' ? 'md:mr-28' : 'md:ml-28',
        'w-32': dir === 'rtl' ? 'md:mr-32' : 'md:ml-32',
        'w-36': dir === 'rtl' ? 'md:mr-36' : 'md:ml-36',
        'w-40': dir === 'rtl' ? 'md:mr-40' : 'md:ml-40',
    } as const;

    const expandedOffsets = {
        'w-64': dir === 'rtl' ? 'md:mr-64' : 'md:ml-64',
        'w-72': dir === 'rtl' ? 'md:mr-72' : 'md:ml-72',
        'w-80': dir === 'rtl' ? 'md:mr-80' : 'md:ml-80',
    } as const;

    const sharedOptions = { breakpoint, isIPad, isTabletLandscape };

    if (isCollapsed) {
        return collapsedOffsets[getCollapsedSidebarWidth(sharedOptions) as keyof typeof collapsedOffsets];
    }

    return expandedOffsets[getExpandedSidebarWidth(sharedOptions) as keyof typeof expandedOffsets];
};
