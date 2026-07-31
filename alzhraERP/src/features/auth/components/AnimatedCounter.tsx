import React, { useRef, useEffect } from 'react';
import { useInView, useMotionValue, useTransform, animate } from 'framer-motion';

interface AnimatedCounterProps {
    target: number;
    suffix?: string;
    duration?: number;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
    target, suffix = '', duration = 2
}) => {
    const ref = useRef<HTMLSpanElement>(null);
    const isInView = useInView(ref, { once: true, margin: '-50px' });
    const count = useMotionValue(0);
    const rounded = useTransform(count, (v) => Math.round(v));

    useEffect(() => {
        if (isInView) {
            animate(count, target, { duration, ease: 'easeOut' });
        }
    }, [isInView, target, duration, count]);

    useEffect(() => {
        const unsubscribe = rounded.on('change', (v) => {
            if (ref.current) {
                ref.current.textContent = v.toLocaleString('en-US') + suffix;
            }
        });
        return unsubscribe;
    }, [rounded, suffix]);

    return <span ref={ref} className="tabular-nums">0{suffix}</span>;
};
