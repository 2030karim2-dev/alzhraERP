import React from 'react';
import { cn } from '../../core/utils';

/**
 * ContentContainer — غلاف ذكي للمحتوى يطبق max-width مناسب لكل breakpoint.
 * 
 * - على الهاتف والتابلت: padding بسيط، لا max-width (يأخذ كامل العرض)
 * - على اللابتوب: max-width 1400px لراحة القراءة
 * - على الديسكتوب: max-width 1800px لاستيعاب محتوى أكثر
 * - على ultra-wide: max-width 2200px مع محاذاة مركزية
 *
 * استخدم `fluid` للجداول والصفحات التي تحتاج العرض الكامل.
 */
interface ContentContainerProps {
    children: React.ReactNode;
    /** السماح بعرض كامل على الشاشات الكبيرة (للوحات البيانات والجداول) */
    fluid?: boolean;
    className?: string;
}

const ContentContainer: React.FC<ContentContainerProps> = ({ children, fluid, className }) => (
    <div
        className={cn(
            'mx-auto w-full px-3 md:px-4 lg:px-6 xl:px-8',
            !fluid && [
                'max-w-none',                          // mobile/tablet: full width
                'xl:max-w-[1400px]',                   // laptop: comfortable reading
                '3xl:max-w-[1800px]',                  // desktop: more content density
                '4xl:max-w-[2200px]',                  // iMac 27": expansive layout
                '5xl:max-w-[2800px]',                  // ultra-wide: maximum comfortable
            ],
            className
        )}
    >
        {children}
    </div>
);

export default ContentContainer;