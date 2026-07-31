import React, { useRef, useCallback } from 'react';
import { useTranslation } from '../../lib/hooks/useTranslation';
import LandingHeader from './components/landing/LandingHeader';
import HeroSection from './components/landing/HeroSection';
import FeaturesSection from './components/landing/FeaturesSection';
import HowItWorksSection from './components/landing/HowItWorksSection';
import CTASection from './components/landing/CTASection';
import LandingFooter from './components/landing/LandingFooter';

// ─── Main Landing Page ─────────────────────────────────────────────
const LandingPage: React.FC = () => {
    const { dir } = useTranslation();
    const authRef = useRef<HTMLDivElement>(null);
    const featuresRef = useRef<HTMLDivElement>(null);
    const howItWorksRef = useRef<HTMLDivElement>(null);

    const scrollToAuth = useCallback(() => {
        authRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, []);

    const scrollToFeatures = useCallback(() => {
        featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    const scrollToHowItWorks = useCallback(() => {
        howItWorksRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    return (
        <div
            data-theme-scope="landing"
            dir={dir}
            className="min-h-screen bg-white dark:bg-slate-950 font-sans transition-colors duration-500 overflow-x-hidden selection:bg-blue-100 selection:text-blue-600 dark:selection:bg-blue-500/30 dark:selection:text-blue-200"
        >
            <LandingHeader
                scrollToAuth={scrollToAuth}
                scrollToFeatures={scrollToFeatures}
                scrollToHowItWorks={scrollToHowItWorks}
            />
            <HeroSection scrollToAuth={scrollToAuth} scrollToFeatures={scrollToFeatures} />
            <FeaturesSection sectionRef={featuresRef} />
            <HowItWorksSection sectionRef={howItWorksRef} />
            <CTASection sectionRef={authRef} />
            <LandingFooter
                scrollToFeatures={scrollToFeatures}
                scrollToHowItWorks={scrollToHowItWorks}
                scrollToAuth={scrollToAuth}
            />
        </div>
    );
};

export default LandingPage;
