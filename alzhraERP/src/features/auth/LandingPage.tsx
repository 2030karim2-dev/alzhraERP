import React, { useRef, useCallback, lazy, Suspense, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '../../lib/hooks/useTranslation';
import { useThemeStore } from '../../lib/themeStore';
import { useLandingScroll } from './landing/useLandingScroll';
import ScrollIndicator from './components/landing/ScrollIndicator';
import LazySection from './components/landing/LazySection';
import './landing/landing.css';

// ── Critical (eager) — visible immediately ──
import LandingHeader from './components/landing/LandingHeader';
import HeroSection from './components/landing/HeroSection';
import CTASection from './components/landing/CTASection';
import LandingFooter from './components/landing/LandingFooter';

// ── Below-fold (lazy) — loaded when about to scroll into view ──
const TrustedBySection = lazy(() => import('./components/landing/TrustedBySection'));
const FeaturesSection = lazy(() => import('./components/landing/FeaturesSection'));
const HowItWorksSection = lazy(() => import('./components/landing/HowItWorksSection'));
const PricingSection = lazy(() => import('./components/landing/PricingSection'));
const TestimonialsSection = lazy(() => import('./components/landing/TestimonialsSection'));
const FAQSection = lazy(() => import('./components/landing/FAQSection'));

// ── Lazy fallback ────────────────────────────────────────────────
const SectionLoading: React.FC = () => (
  <div className="flex items-center justify-center py-8">
    <motion.div
      animate={{ opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 1.5, repeat: Infinity }}
      className="h-8 w-8 rounded-full border-2 border-blue-500 border-t-transparent"
    />
  </div>
);

/* eslint-disable max-lines-per-function -- مكوّن صفحة الهبوط يجمع الأقسام الكسولة ولا يمكن تقليصه بلا كسر التجربة */
// ─── Main Landing Page ─────────────────────────────────────────────
const LandingPage: React.FC = () => {
  const { dir } = useTranslation();
  const { theme } = useThemeStore();
  const { containerRef, scrollToSection } = useLandingScroll();
  const authRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const howItWorksRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);
  const faqRef = useRef<HTMLDivElement>(null);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');

  const scrollToAuth = useCallback(() => {
    authRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const scrollToRegister = useCallback(() => {
    setAuthTab('register');
    scrollToAuth();
  }, [scrollToAuth]);

  const scrollToFeatures = useCallback(() => {
    scrollToSection(featuresRef);
  }, [scrollToSection]);

  const scrollToHowItWorks = useCallback(() => {
    scrollToSection(howItWorksRef);
  }, [scrollToSection]);

  const scrollToPricing = useCallback(() => {
    scrollToSection(pricingRef);
  }, [scrollToSection]);

  const scrollToFAQ = useCallback(() => {
    scrollToSection(faqRef);
  }, [scrollToSection]);

  return (
    <div
      ref={containerRef}
      data-theme-scope="landing"
      dir={dir}
      className={`landing-page min-h-screen overflow-x-hidden font-sans transition-colors duration-500 selection:bg-blue-100 selection:text-blue-600 dark:selection:bg-blue-500/30 dark:selection:text-blue-200 ${
        theme === 'dark' ? 'dark' : ''
      }`}
      style={{ backgroundColor: 'var(--app-bg)' }}
      id="landing-main"
    >
      <LandingHeader
        scrollToAuth={scrollToAuth}
        scrollToRegister={scrollToRegister}
        scrollToFeatures={scrollToFeatures}
        scrollToHowItWorks={scrollToHowItWorks}
        scrollToPricing={scrollToPricing}
      />

      <HeroSection scrollToRegister={scrollToRegister} scrollToFeatures={scrollToFeatures} />

      {/* Scroll Indicator */}
      <div className="relative z-20 -mt-12 mb-6 flex justify-center">
        <ScrollIndicator onClick={scrollToFeatures} />
      </div>

      <Suspense fallback={<SectionLoading />}>
        <LazySection>
          <TrustedBySection />
        </LazySection>
      </Suspense>

      <Suspense fallback={<SectionLoading />}>
        <LazySection>
          <FeaturesSection sectionRef={featuresRef} />
        </LazySection>
      </Suspense>

      <Suspense fallback={<SectionLoading />}>
        <LazySection>
          <HowItWorksSection sectionRef={howItWorksRef} />
        </LazySection>
      </Suspense>

      <Suspense fallback={<SectionLoading />}>
        <LazySection>
          <PricingSection sectionRef={pricingRef} onStart={scrollToRegister} />
        </LazySection>
      </Suspense>

      <Suspense fallback={<SectionLoading />}>
        <LazySection>
          <TestimonialsSection />
        </LazySection>
      </Suspense>

      <Suspense fallback={<SectionLoading />}>
        <LazySection>
          <FAQSection sectionRef={faqRef} />
        </LazySection>
      </Suspense>

      <CTASection sectionRef={authRef} authTab={authTab} onTabChange={setAuthTab} />

      <LandingFooter
        scrollToFeatures={scrollToFeatures}
        scrollToHowItWorks={scrollToHowItWorks}
        scrollToAuth={scrollToAuth}
        scrollToPricing={scrollToPricing}
        scrollToFAQ={scrollToFAQ}
      />
    </div>
  );
};

export default LandingPage;
