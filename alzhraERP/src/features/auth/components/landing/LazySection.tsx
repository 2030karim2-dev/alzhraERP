import React, { useRef } from 'react';
import { motion, useInView, type UseInViewOptions } from 'framer-motion';

interface LazySectionProps {
  children: React.ReactNode;
  /** الهامش قبل الوصول للعنصر لبدء التحميل (rootMargin) */
  margin?: UseInViewOptions['margin'];
  /** الحد الأدنى لارتفاع عنصر الحجز قبل التحميل */
  minHeight?: number;
}

/**
 * غلاف تحميل كسول حقيقي:
 * لا يُركّب المحتوى (ولن يُطلب الـ JS chunk) إلا عندما يقترب القسم من نافذة العرض.
 * هذا يحل مشكلة `React.lazy` التي تطلب جميع الأقسام فور التركيب.
 */
const LazySection: React.FC<LazySectionProps> = ({
  children,
  margin = '500px 0px',
  minHeight = 120,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin, once: true });

  return (
    <div ref={ref} style={{ minHeight: isInView ? undefined : minHeight }}>
      {isInView ? (
        children
      ) : (
        <div className="flex items-center justify-center py-8">
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="h-8 w-8 rounded-full border-2 border-blue-500 border-t-transparent"
          />
        </div>
      )}
    </div>
  );
};

export default LazySection;
