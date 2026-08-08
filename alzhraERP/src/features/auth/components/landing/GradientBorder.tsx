import React from 'react';
import { motion } from 'framer-motion';

interface GradientBorderProps {
  children: React.ReactNode;
  className?: string;
  /** قيمة border-radius (تطبق على الإطار والمحتوى) */
  radius?: string;
  /** تنشيط تأثير الإطار المتدرج تلقائياً عند hover */
  hover?: boolean;
  /** دائماً مُفعّل */
  always?: boolean;
}

/**
 * غلاف بميزة إطار متدرج متحرك
 * @param radius - قيمة border-radius الافتراضية: 1.5rem
 */
export const GradientBorder: React.FC<GradientBorderProps> = ({
  children,
  className = '',
  radius = '1.5rem',
  hover = true,
  always = false,
}) => {
  return (
    <div className={`relative group ${className}`} style={{ borderRadius: radius }}>
      {/* Animated gradient border layer */}
      <motion.div
        className={`absolute -inset-[2px] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-[length:300%_300%] -z-10 transition-opacity duration-500 ${
          always ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        style={{ borderRadius: `calc(${radius} + 2px)` }}
        animate={always || hover ? {
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        } : {}}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
      />

      {/* Content */}
      <div className="relative bg-inherit" style={{ borderRadius: radius }}>
        {children}
      </div>
    </div>
  );
};
