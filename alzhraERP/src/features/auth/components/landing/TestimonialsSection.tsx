import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { SectionHeader } from '../SectionHeader';
import { LANDING_TESTIMONIALS } from '../../landing/landing.constants';

/* eslint-disable max-lines-per-function -- قسم آراء العملاء يعرض الكاروسيل ببطاقة كاملة */
const TestimonialsSection: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const items = LANDING_TESTIMONIALS;
  // eslint-disable-next-line security/detect-object-injection -- فهرسة مصفوفة آراء ثابتة بمؤشر محسوب من length
  const currentItem = items[current];

  const next = (): void => {
    setCurrent(prev => (prev + 1) % items.length);
  };
  const prev = (): void => {
    setCurrent(prev => (prev - 1 + items.length) % items.length);
  };

  return (
    <section
      className="relative z-10 overflow-hidden px-4 py-32"
      style={{ backgroundColor: 'var(--app-surface)' }}
    >
      <div className="mx-auto max-w-[1440px]">
        <SectionHeader
          badge="آراء العملاء"
          title="ماذا يقول عملاؤنا عن النظام؟"
          highlightedWord="عملاؤنا"
          description="لا تأخذ كلامنا فقط... استمع لتجارب حقيقية من أصحاب مراكز قطع الغيار الذين يستخدمون النظام يومياً."
          accent="orange"
        />

        <div className="relative mx-auto max-w-4xl">
          <div className="mb-12 flex justify-center gap-4">
            <button
              onClick={prev}
              aria-label="السابق"
              type="button"
              className="group flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm transition-all hover:border-blue-400 sm:h-12 sm:w-12"
            >
              <ChevronRight
                size={14}
                className="text-[var(--app-text-secondary)] transition-colors group-hover:text-blue-500 sm:h-5 sm:w-5"
              />
            </button>
            <div className="flex items-center gap-1 sm:gap-2">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setCurrent(i);
                  }}
                  type="button"
                  aria-label={`الانتقال للرأي رقم ${String(i + 1)}`}
                  className={`h-1.5 w-1.5 rounded-full transition-all sm:h-2.5 sm:w-2.5 ${
                    i === current
                      ? 'w-4 bg-blue-500 shadow-md shadow-blue-500/30 sm:w-8'
                      : 'bg-gray-300 hover:bg-blue-300 dark:bg-slate-600'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={next}
              aria-label="التالي"
              type="button"
              className="group flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm transition-all hover:border-blue-400 sm:h-12 sm:w-12"
            >
              <ChevronLeft
                size={14}
                className="text-[var(--app-text-secondary)] transition-colors group-hover:text-blue-500 sm:h-5 sm:w-5"
              />
            </button>
          </div>

          {/* Carousel */}
          <div
            role="group"
            aria-roledescription="عرض الشرائح"
            aria-label="آراء العملاء"
            aria-live="polite"
            className="relative min-h-[280px] overflow-hidden"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4 }}
                className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg)] p-4 shadow-2xl shadow-blue-500/5 sm:p-12"
              >
                <div className="mb-3 flex items-center gap-0.5 sm:mb-6 sm:gap-1">
                  {Array.from({ length: 5 }, (_, i) => i).map(i => (
                    <Star
                      key={i}
                      size={12}
                      className={
                        i < currentItem.rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-gray-200 dark:text-slate-600 sm:h-5 sm:w-5'
                      }
                    />
                  ))}
                </div>
                <blockquote className="mb-4 text-xs font-black uppercase leading-tight tracking-tighter text-[var(--app-text)] sm:mb-8 sm:text-xl sm:leading-relaxed">
                  «{currentItem.text}»
                </blockquote>
                <div className="flex items-center gap-3 border-t border-[var(--app-border)] pt-4 sm:gap-4 sm:pt-6">
                  <div
                    className={`h-8 w-8 sm:h-12 sm:w-12 ${currentItem.avatarColor} flex items-center justify-center rounded-none text-xs font-black text-white shadow-lg sm:text-lg`}
                  >
                    {currentItem.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase leading-none tracking-tighter text-[var(--app-text)] sm:text-lg">
                      {currentItem.name}
                    </div>
                    <div className="mt-0.5 text-[11px] font-black uppercase tracking-tighter text-[var(--app-text-secondary)] sm:text-sm">
                      {currentItem.role} — {currentItem.company}
                    </div>
                    <div className="mt-0.5 text-[10px] font-black uppercase tracking-tighter text-[var(--app-text-secondary)] sm:text-xs">
                      📍 {currentItem.location}
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
