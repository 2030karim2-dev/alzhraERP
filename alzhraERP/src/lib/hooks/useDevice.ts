import { useState, useEffect } from 'react';

export type DeviceCategory = 'phone' | 'tablet' | 'desktop';
export type DeviceType = 'mac' | 'ipad' | 'iphone' | 'windows' | 'android' | 'linux' | 'unknown';

export interface DeviceInfo {
    // Device type
    deviceType: DeviceType;
    deviceCategory: DeviceCategory;

    // Screen dimensions
    screenWidth: number;
    screenHeight: number;

    // Device pixel ratio for HiDPI
    devicePixelRatio: number;

    // Boolean flags
    isMac: boolean;
    isIPad: boolean;
    isIPhone: boolean;
    isTablet: boolean;
    isMobile: boolean;
    isDesktop: boolean;
    isHiDPI: boolean;
    isRetina: boolean;
    isTouchDevice: boolean;

    // Large screen flags
    isLargeScreen: boolean;
    isExtraLargeScreen: boolean;
    isUltraWide: boolean;
}

export const useDevice = (): DeviceInfo => {
    const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => getDeviceInfo());

    useEffect(() => {
        const handleResize = () => {
            setDeviceInfo(getDeviceInfo());
        };

        window.addEventListener('resize', handleResize);
        // Also listen for orientation change on mobile devices
        window.addEventListener('orientationchange', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
        };
    }, []);

    return deviceInfo;
};

function getDeviceInfo(): DeviceInfo {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        return {
            deviceType: 'unknown',
            deviceCategory: 'desktop',
            screenWidth: 0,
            screenHeight: 0,
            devicePixelRatio: 1,
            isMac: false,
            isIPad: false,
            isIPhone: false,
            isTablet: false,
            isMobile: false,
            isDesktop: true,
            isHiDPI: false,
            isRetina: false,
            isTouchDevice: false,
            isLargeScreen: false,
            isExtraLargeScreen: false,
            isUltraWide: false,
        };
    }

    const ua = navigator.userAgent.toLowerCase();
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    // Detect device type
    const isMac = ua.includes('macintosh') || ua.includes('mac os x');
    const isIPad = ua.includes('ipad') || (ua.includes('macintosh') && 'ontouchstart' in window);
    const isIPhone = ua.includes('iphone');
    const isWindows = ua.includes('windows');
    const isAndroid = ua.includes('android');
    const isLinux = ua.includes('linux');

    // Detect device category based on screen width and user agent
    let deviceCategory: DeviceCategory;
    if (isIPad || (width >= 768 && width <= 1024)) {
        deviceCategory = 'tablet';
    } else if (width < 768 || isIPhone) {
        deviceCategory = 'phone';
    } else {
        deviceCategory = 'desktop';
    }

    // Touch device detection
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // HiDPI/Retina detection
    const isHiDPI = dpr > 1;
    const isRetina = dpr >= 2;

    // Large screen detection
    const isLargeScreen = width >= 1920;
    const isExtraLargeScreen = width >= 2560;
    const isUltraWide = width >= 3440;

    // Map to device type
    let deviceType: DeviceType = 'unknown';
    if (isMac) deviceType = 'mac';
    else if (isIPad) deviceType = 'ipad';
    else if (isIPhone) deviceType = 'iphone';
    else if (isWindows) deviceType = 'windows';
    else if (isAndroid) deviceType = 'android';
    else if (isLinux) deviceType = 'linux';

    return {
        deviceType,
        deviceCategory,
        screenWidth: width,
        screenHeight: height,
        devicePixelRatio: dpr,
        isMac,
        isIPad,
        isIPhone,
        isTablet: deviceCategory === 'tablet',
        isMobile: deviceCategory === 'phone',
        isDesktop: deviceCategory === 'desktop',
        isHiDPI,
        isRetina,
        isTouchDevice,
        isLargeScreen,
        isExtraLargeScreen,
        isUltraWide,
    };
}

export default useDevice;
