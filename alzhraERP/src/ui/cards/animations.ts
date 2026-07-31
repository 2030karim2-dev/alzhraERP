/**
 * Card System - Animation Variants
 * Alzhra Smart ERP - Card Design System v2.0
 * Using Framer Motion
 */

import { Variants } from 'framer-motion';

// ======== Card Entrance Animations ========

export const cardEntranceVariants: Variants = {
    hidden: {
        opacity: 0,
        y: 20,
        scale: 0.95,
    },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: 'spring',
            stiffness: 300,
            damping: 30,
        },
    },
    exit: {
        opacity: 0,
        y: -20,
        scale: 0.95,
        transition: {
            duration: 0.2,
        },
    },
};

// ======== Hover Animations ========

export const cardHoverVariants: Variants = {
    rest: {
        y: 0,
        scale: 1,
        boxShadow: '0 4px 16px -4px rgba(0,0,0,0.08)',
    },
    hover: {
        y: -4,
        scale: 1.01,
        boxShadow: '0 12px 40px -8px rgba(0,0,0,0.15)',
        transition: {
            type: 'spring',
            stiffness: 400,
            damping: 25,
        },
    },
    tap: {
        scale: 0.98,
        y: -2,
        transition: {
            duration: 0.1,
        },
    },
};

// ======== Loading Animation ========

export const cardLoadingVariants: Variants = {
    loading: {
        opacity: [0.5, 1, 0.5],
        transition: {
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
        },
    },
    loaded: {
        opacity: 1,
        transition: {
            duration: 0.3,
        },
    },
};

// ======== Stagger Children Animation ========

export const cardContainerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1,
        },
    },
};

export const cardItemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: 'spring',
            stiffness: 350,
            damping: 25,
        },
    },
};

// ======== Sparkline Animation ========

export const sparklineVariants: Variants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
        pathLength: 1,
        opacity: 1,
        transition: {
            pathLength: {
                duration: 1.5,
                ease: 'easeOut',
            },
            opacity: {
                duration: 0.3,
            },
        },
    },
};

// ======== Alert Card Animations ========

export const alertCardVariants: Variants = {
    hidden: {
        opacity: 0,
        x: 50,
        scale: 0.9,
    },
    visible: {
        opacity: 1,
        x: 0,
        scale: 1,
        transition: {
            type: 'spring',
            stiffness: 400,
            damping: 25,
        },
    },
    exit: {
        opacity: 0,
        x: 100,
        scale: 0.9,
        transition: {
            duration: 0.3,
        },
    },
};

// ======== Metric Card Count Up Animation ========

export const countUpTransition = {
    duration: 1.5,
    ease: [0.4, 0, 0.2, 1],
};

// ======== Ripple Effect Animation ========

export const rippleVariants: Variants = {
    initial: {
        scale: 0,
        opacity: 0.5,
    },
    animate: {
        scale: 2.5,
        opacity: 0,
        transition: {
            duration: 0.6,
            ease: 'easeOut',
        },
    },
};

// ======== Fade In Animation ========

export const fadeInVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            duration: 0.3,
        },
    },
    exit: {
        opacity: 0,
        transition: {
            duration: 0.2,
        },
    },
};

// ======== Scale Animation ========

export const scaleVariants: Variants = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: {
        scale: 1,
        opacity: 1,
        transition: {
            type: 'spring',
            stiffness: 300,
            damping: 20,
        },
    },
    exit: {
        scale: 0.9,
        opacity: 0,
        transition: {
            duration: 0.2,
        },
    },
};

// ======== Slide Animations ========

export const slideUpVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: {
            type: 'spring',
            stiffness: 300,
            damping: 30,
        },
    },
    exit: {
        y: -20,
        opacity: 0,
        transition: {
            duration: 0.2,
        },
    },
};

export const slideDownVariants: Variants = {
    hidden: { y: -20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: {
            type: 'spring',
            stiffness: 300,
            damping: 30,
        },
    },
    exit: {
        y: 20,
        opacity: 0,
        transition: {
            duration: 0.2,
        },
    },
};

// ======== Icon Animations ========

export const iconHoverVariants: Variants = {
    rest: { scale: 1, rotate: 0 },
    hover: {
        scale: 1.1,
        rotate: 5,
        transition: {
            type: 'spring',
            stiffness: 400,
            damping: 10,
        },
    },
};

// ======== Progress Bar Animation ========

export const progressBarVariants: Variants = {
    hidden: { width: 0 },
    visible: (width: number) => ({
        width: `${width}%`,
        transition: {
            duration: 1,
            ease: 'easeOut',
        },
    }),
};

// ======== Skeleton Loading Animation ========

export const skeletonVariants: Variants = {
    animate: {
        backgroundPosition: ['-200% 0', '200% 0'],
        transition: {
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear',
        },
    },
};

// ======== Pulse Animation ========

export const pulseVariants: Variants = {
    animate: {
        scale: [1, 1.05, 1],
        opacity: [1, 0.8, 1],
        transition: {
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
        },
    },
};

// ======== Badge Animation ========

export const badgeVariants: Variants = {
    initial: { scale: 0, opacity: 0 },
    animate: {
        scale: 1,
        opacity: 1,
        transition: {
            type: 'spring',
            stiffness: 500,
            damping: 15,
        },
    },
    exit: {
        scale: 0,
        opacity: 0,
        transition: {
            duration: 0.2,
        },
    },
};

// ======== Glass Shimmer Animation ========

export const glassShimmerVariants: Variants = {
    animate: {
        background: [
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
            'linear-gradient(90deg, transparent 100%, rgba(255,255,255,0.1) 150%, transparent 200%)',
        ],
        transition: {
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
        },
    },
};

// ======== Number Counter Animation Config ========

export const numberCounterConfig = {
    duration: 1.5,
    ease: [0.4, 0, 0.2, 1],
};
