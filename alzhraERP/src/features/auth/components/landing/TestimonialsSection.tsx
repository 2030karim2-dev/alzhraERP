import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { SectionHeader } from '../SectionHeader';
import { LANDING_TESTIMONIALS } from '../../landing/landing.constants';

/* eslint-disable max-lines-per-function -- قسم آراء وتقييمات العملاء بصفحة الهبوط */
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
      className="relative z-10 overflow-hidden px-4 py-12 sm:py-16"
      style={{ backgroundColor: 'var(--app-surface)' }}
    >
      <div className="mx-auto max-w-[1440px]">
        <SectionHeader
          badge="آراء العملاء"
          title="ماذا يقول عملاؤنا عن النظام؟"
          highlightedWord="عملاؤنا"
          description="تجارب حقيقية من أصحاب ومدراء مراكز قطع الغيار الذين يعتمدون على النظام يومياً."
          accent="orange"
        />

        <div className="relative mx-auto max-w-3xl">
          <div className="mb-6 flex justify-center gap-3">
            <button
              onClick={prev}
              aria-label="السابق"
              type="button"
              className="group flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] shadow-sm transition-colors hover:border-blue-400 sm:h-9 sm:w-9"
            >
              <ChevronRight
                size={16}
                className="text-[var(--app-text-secondary)] transition-colors group-hover:text-blue-500"
              />
            </button>
            <div className="flex items-center gap-1.5">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setCurrent(i);
                  }}
                  type="button"
                  aria-label={`الانتقال للرأي رقم ${String(i + 1)}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === current
                      ? 'w-4 bg-blue-600 dark:bg-blue-400'
                      : 'w-1.5 bg-slate-300 hover:bg-slate-400 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={next}
              aria-label="التالي"
              type="button"
              className="group flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] shadow-sm transition-colors hover:border-blue-400 sm:h-9 sm:w-9"
            >
              <ChevronLeft
                size={16}
                className="text-[var(--app-text-secondary)] transition-colors group-hover:text-blue-500"
              />
            </button>
          </div>

          {/* Carousel */}
          <div
            role="group"
            aria-roledescription="عرض الشرائح"
            aria-label="آراء العملاء"
            aria-live="polite"
            className="relative min-h-[180px] overflow-hidden"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] p-4 shadow-sm sm:p-6"
              >
                <div className="mb-2.5 flex items-center gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => i).map(i => (
                    <Star
                      key={i}
                      size={14}
                      className={
                        i < currentItem.rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-gray-200 dark:text-slate-700'
                      }
                    />
                  ))}
                </div>
                <blockquote className="mb-4 text-xs font-normal leading-relaxed text-slate-800 dark:text-slate-200 sm:text-sm">
                  «{currentItem.text}»
                </blockquote>
                <div className="flex items-center gap-2.5 border-t border-[var(--app-border)] pt-3 sm:gap-3 sm:pt-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white shadow-sm sm:h-9 sm:w-9">
                    {currentItem.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white sm:text-sm">
                      {currentItem.name}
                    </div>
                    <div className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                      {currentItem.role}، {currentItem.company}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <MapPin size={11} /> {currentItem.location}
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
