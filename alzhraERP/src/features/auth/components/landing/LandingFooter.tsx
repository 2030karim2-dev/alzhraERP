import React from 'react';
import { Car, Globe, Mail, Users, Heart } from 'lucide-react';

interface LandingFooterProps {
    scrollToFeatures: () => void;
    scrollToHowItWorks: () => void;
    scrollToAuth: () => void;
}

const LandingFooter: React.FC<LandingFooterProps> = ({ scrollToFeatures, scrollToHowItWorks, scrollToAuth }) => {
    return (
        <footer className="relative bg-slate-950 pt-32 pb-12 overflow-hidden border-t border-slate-900">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent" />

            <div className="max-w-none mx-auto px-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16 mb-24">
                    <div className="lg:col-span-1">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30">
                                <Car className="text-white" size={26} />
                            </div>
                            <div>
                                <span className="block text-xl font-black text-white leading-none tracking-tight">نظام الزهراء</span>
                                <span className="block text-[10px] text-blue-500 uppercase tracking-[0.2em] font-black mt-1">Auto Parts ERP</span>
                            </div>
                        </div>
                        <p className="text-slate-500 leading-relaxed font-medium mb-10 text-base">
                            المنصة العربية الرائدة في إدارة محلات ومراكز صيانة السيارات. نوفر حلولاً عالمية لتبسيط عملياتكم وزيادة أرباحكم.
                            <br />
                            <span className="text-blue-400 mt-2 block">الجمهورية اليمنية - المهرة</span>
                        </p>
                        <div className="flex gap-4">
                            {[
                                { icon: Globe, label: 'زيارة الموقع التعريفي' },
                                { icon: Mail, label: 'إرسال بريد إلكتروني' },
                                { icon: Users, label: 'التواصل مع فريق الدعم' },
                            ].map(({ icon: Icon, label }) => (
                                <button key={label} aria-label={label} className="w-11 h-11 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 hover:text-blue-400 hover:border-blue-500/30 transition-all shadow-sm group">
                                    <Icon size={18} className="group-hover:scale-110 transition-transform" />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-white font-black mb-8 lg:mb-10 text-lg uppercase tracking-tight">الروابط السريعة</h4>
                        <ul className="space-y-4 lg:space-y-5 font-medium text-slate-500">
                            <li><button onClick={scrollToFeatures} className="hover:text-blue-400 transition-colors">الميزات الرئيسية</button></li>
                            <li><button onClick={scrollToHowItWorks} className="hover:text-blue-400 transition-colors">كيفية الاستخدام</button></li>
                            <li><button onClick={scrollToAuth} className="hover:text-blue-400 transition-colors">تسجيل الدخول</button></li>
                            <li><button className="hover:text-blue-400 transition-colors">الأسعار والباقات</button></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-black mb-8 lg:mb-10 text-lg uppercase tracking-tight">الدعم والمساعدة</h4>
                        <ul className="space-y-4 lg:space-y-5 font-medium text-slate-500">
                            <li><a href="#" className="hover:text-blue-400 transition-colors">الأسئلة الشائعة</a></li>
                            <li><a href="#" className="hover:text-blue-400 transition-colors">سياسة الخصوصية</a></li>
                            <li><a href="#" className="hover:text-blue-400 transition-colors">شروط الاستخدام</a></li>
                            <li><a href="mailto:2030.krim2@gmail.com" className="hover:text-blue-400 transition-colors">اتصل بنا</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-black mb-8 lg:mb-10 text-lg uppercase tracking-tight">النشرة البريدية</h4>
                        <p className="text-slate-500 mb-8 font-medium">اشترك لتصلك أحدث الميزات والتحديثات الدورية بنظامنا.</p>
                        <div className="relative">
                            <input
                                type="email"
                                placeholder="بريدك@مثال.com"
                                autoComplete="email"
                                aria-label="البريد الإلكتروني للنشرة البريدية"
                                dir="ltr"
                                className="w-full px-6 py-4 bg-slate-900 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-700 text-white shadow-inner"
                            />
                            <button aria-label="الاشتراك في النشرة البريدية" className="absolute ltr:left-2 rtl:right-2 top-2 bottom-2 px-6 bg-blue-600 text-white rounded-[0.9rem] font-black text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
                                اشترك
                            </button>
                        </div>
                    </div>
                </div>

                <div className="pt-10 border-t border-slate-900/50 flex flex-col md:flex-row items-center justify-between gap-8">
                    <p className="text-slate-600 text-sm font-bold">
                        © {new Date().getFullYear()} نظام الزهراء. جميع الحقوق محفوظة.
                    </p>
                    <div className="flex items-center gap-3 text-slate-600 text-sm font-bold bg-slate-900/50 px-6 py-3 rounded-full border border-slate-900">
                        صنع بكل <Heart size={16} className="text-rose-500 animate-pulse fill-rose-500" /> لمستقبل أذكى
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default LandingFooter;
