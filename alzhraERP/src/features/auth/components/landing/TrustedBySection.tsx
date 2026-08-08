import React from 'react';
import { motion } from 'framer-motion';
import { Star, Award } from 'lucide-react';
import { LANDING_TRUSTED_BY } from '../landing.constants';

const TrustedBySection: React.FC = () => {
    const brands = [...LANDING_TRUSTED_BY, ...LANDING_TRUSTED_BY]; // duplicate for seamless loop

    return (
        <section className="relative py-20 z-10 overflow-hidden border-y" style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}>
            <div className="max-w-none mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-12"
                >
                    <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] mb-4" style={{ color: 'var(--app-text-secondary)' }}>
                        <Award size={16} className="text-amber-500" />
                        موثوق من قبل +100 مركز ومحل
                        <Star size={16} className="text-amber-500" />
                    </div>
                </motion.div>

                {/* CSS Marquee */}
                <div className="relative overflow-hidden py-4">
                    <style>{`
                        @keyframes trustMarquee {
                            0% { transform: translateX(0); }
                            100% { transform: translateX(-50%); }
                        }
                        .trust-marquee {
                            display: flex; width: max-content;
                            animation: trustMarquee 35s linear infinite;
                        }
                        .trust-marquee:hover { animation-play-state: paused; }
                    `}</style>
                    <div className="trust-marquee">
                        {brands.map((brand, i) => (
                            <div
                                key={`trust-${i}`}
                                className="flex-shrink-0 mx-4 px-8 py-4 rounded-2xl border shadow-sm transition-shadow hover:shadow-md"
                                style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--app-border)' }}
                            >
                                <span className="text-lg font-black whitespace-nowrap select-none" style={{ color: 'var(--app-text-secondary)' }}>
                                    {brand}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Fade edges */}
                    <div className="absolute inset-y-0 left-0 w-24 z-10 pointer-events-none" style={{ background: 'linear-gradient(to right, var(--app-surface), transparent)' }} />
                    <div className="absolute inset-y-0 right-0 w-24 z-10 pointer-events-none" style={{ background: 'linear-gradient(to left, var(--app-surface), transparent)' }} />
                </div>
            </div>
        </section>
    );
};

export default TrustedBySection;

