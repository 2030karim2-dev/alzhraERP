import React, { useRef, useCallback, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '../../lib/hooks/useTranslation';
import { useThemeStore } from '../../lib/themeStore';
import { useLandingScroll } from './landing/useLandingScroll';
import ScrollIndicator from './components/landing/ScrollIndicator';
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
const SectionFallback: React.FC = () => (
    <div className="flex items-center justify-center py-32">
        <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent"
        />
    </div>
);

// ─── Main Landing Page ─────────────────────────────────────────────
const LandingPage: React.FC = () => {
    const { dir } = useTranslation();
    const { theme } = useThemeStore();
    const { containerRef, scrollToSection } = useLandingScroll();
    const authRef = useRef<HTMLDivElement>(null);
    const featuresRef = useRef<HTMLDivElement>(null);
    const howItWorksRef = useRef<HTMLDivElement>(null);
    const pricingRef = useRef<HTMLDivElement>(null);

    const scrollToAuth = useCallback(() => {
        authRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, []);

    const scrollToFeatures = useCallback(() => {
        scrollToSection(featuresRef);
    }, [scrollToSection]);

    const scrollToHowItWorks = useCallback(() => {
        scrollToSection(howItWorksRef);
    }, [scrollToSection]);

    const scrollToPricing = useCallback(() => {
        scrollToSection(pricingRef);
    }, [scrollToSection]);

    return (
        <div
            ref={containerRef}
            data-theme-scope="landing"
            dir={dir}
            className={`landing-page min-h-screen font-sans transition-colors duration-500 overflow-x-hidden selection:bg-blue-100 selection:text-blue-600 dark:selection:bg-blue-500/30 dark:selection:text-blue-200 ${
                theme === 'dark' ? 'dark' : ''
            }`}
            style={{ backgroundColor: 'var(--app-bg)' }}
            id="landing-main"
        >
            <LandingHeader
                scrollToAuth={scrollToAuth}
                scrollToFeatures={scrollToFeatures}
                scrollToHowItWorks={scrollToHowItWorks}
                scrollToPricing={scrollToPricing}
            />

            <HeroSection scrollToAuth={scrollToAuth} scrollToFeatures={scrollToFeatures} />

            {/* Scroll Indicator */}
            <div className="flex justify-center -mt-16 mb-8 relative z-20">
                <ScrollIndicator onClick={scrollToFeatures} />
            </div>

            <Suspense fallback={<SectionFallback />}>
                <TrustedBySection />
            </Suspense>

            <Suspense fallback={<SectionFallback />}>
                <FeaturesSection sectionRef={featuresRef} />
            </Suspense>

            <Suspense fallback={<SectionFallback />}>
                <HowItWorksSection sectionRef={howItWorksRef} />
            </Suspense>

            <Suspense fallback={<SectionFallback />}>
                <PricingSection sectionRef={pricingRef} />
            </Suspense>

            <Suspense fallback={<SectionFallback />}>
                <TestimonialsSection />
            </Suspense>

            <Suspense fallback={<SectionFallback />}>
                <FAQSection />
            </Suspense>

            <CTASection sectionRef={authRef} />

            <LandingFooter
                scrollToFeatures={scrollToFeatures}
                scrollToHowItWorks={scrollToHowItWorks}
                scrollToAuth={scrollToAuth}
                scrollToPricing={scrollToPricing}
            />
        </div>
    );
};

export default LandingPage;

