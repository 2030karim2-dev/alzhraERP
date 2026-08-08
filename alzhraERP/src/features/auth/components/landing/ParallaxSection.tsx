import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface ParallaxLayerProps {
  children: React.ReactNode;
  /** سرعة التمرير النسبية (1 = عادي، 0.5 = بطيء، -0.5 = عكسي) */
  speed?: number;
  className?: string;
}

/**
 * طبقة Parallax للخلفيات والعناصر الزخرفية
 */
export const ParallaxLayer: React.FC<ParallaxLayerProps> = ({ children, speed = 0.5, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 100 * speed]);

  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
};

/**
 * غلاف لقسم مع تأثير parallax للخلفية
 */
interface ParallaxSectionProps {
  children: React.ReactNode;
  className?: string;
  /** لون الخلفية */
  bgStyle?: React.CSSProperties;
}

export const ParallaxSection: React.FC<ParallaxSectionProps> = ({ children, className = '', bgStyle }) => {
  return (
    <div className={`relative overflow-hidden ${className}`} style={bgStyle}>
      {children}
    </div>
  );
};
