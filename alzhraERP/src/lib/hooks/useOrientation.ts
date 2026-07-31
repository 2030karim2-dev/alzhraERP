import { useState, useEffect } from 'react';

export type Orientation = 'portrait' | 'landscape';
export type AspectRatioType = 'wide' | 'standard' | 'narrow';

export interface OrientationState {
    orientation: Orientation;
    aspectRatio: number;
    aspectRatioType: AspectRatioType;
    isLandscape: boolean;
    isPortrait: boolean;

    // Device-specific orientation states
    isPhoneLandscape: boolean;
    isPhonePortrait: boolean;
    isTabletLandscape: boolean;
    isTabletPortrait: boolean;

    // Screen dimensions
    width: number;
    height: number;

    // Breakpoints
    isNarrow: boolean;     // < 480px
    isSmall: boolean;      // < 640px
    isMedium: boolean;     // < 768px  
    isLarge: boolean;      // < 1024px
    isXLarge: boolean;     // < 1280px
    is2XLarge: boolean;    // < 1536px
    is3XLarge: boolean;    // < 1920px
    is4XLarge: boolean;   // < 2560px
    is5XLarge: boolean;   // >= 2560px
}

export const useOrientation = (): OrientationState => {
    const [state, setState] = useState<OrientationState>(() => getOrientationState());

    useEffect(() => {
        const handleResize = () => {
            setState(getOrientationState());
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);

        let handleOrientationChange: (() => void) | null = null;
        if (typeof screen !== 'undefined' && screen.orientation) {
            handleOrientationChange = () => {
                setState(getOrientationState());
            };
            screen.orientation.addEventListener('change', handleOrientationChange);
        }

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
            if (handleOrientationChange && typeof screen !== 'undefined' && screen.orientation) {
                screen.orientation.removeEventListener('change', handleOrientationChange);
            }
        };
    }, []);

    return state;
};

function getOrientationState(): OrientationState {
    if (typeof window === 'undefined') {
        return {
            orientation: 'landscape',
            aspectRatio: 1,
            aspectRatioType: 'standard',
            isLandscape: true,
            isPortrait: false,
            isPhoneLandscape: false,
            isPhonePortrait: false,
            isTabletLandscape: false,
            isTabletPortrait: false,
            width: 0,
            height: 0,
            isNarrow: true,
            isSmall: true,
            isMedium: true,
            isLarge: true,
            isXLarge: true,
            is2XLarge: true,
            is3XLarge: true,
            is4XLarge: true,
            is5XLarge: false,
        };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Determine orientation
    const orientation: Orientation = width > height ? 'landscape' : 'portrait';
    const isLandscape = orientation === 'landscape';
    const isPortrait = orientation === 'portrait';

    // Calculate aspect ratio
    const aspectRatio = width / height;
    let aspectRatioType: AspectRatioType = 'standard';
    if (aspectRatio > 1.77) aspectRatioType = 'wide';
    else if (aspectRatio < 0.75) aspectRatioType = 'narrow';

    // Determine device category based on width
    const isPhone = width < 768;
    const isTablet = width >= 768 && width < 1024;

    // Device-specific orientation states
    const isPhoneLandscape = isPhone && isLandscape;
    const isPhonePortrait = isPhone && isPortrait;
    const isTabletLandscape = isTablet && isLandscape;
    const isTabletPortrait = isTablet && isPortrait;

    // Breakpoint states
    const isNarrow = width < 480;
    const isSmall = width < 640;
    const isMedium = width < 768;
    const isLarge = width < 1024;
    const isXLarge = width < 1280;
    const is2XLarge = width < 1536;
    const is3XLarge = width < 1920;
    const is4XLarge = width < 2560;
    const is5XLarge = width >= 2560;

    return {
        orientation,
        aspectRatio,
        aspectRatioType,
        isLandscape,
        isPortrait,
        isPhoneLandscape,
        isPhonePortrait,
        isTabletLandscape,
        isTabletPortrait,
        width,
        height,
        isNarrow,
        isSmall,
        isMedium,
        isLarge,
        isXLarge,
        is2XLarge,
        is3XLarge,
        is4XLarge,
        is5XLarge,
    };
}

export default useOrientation;
