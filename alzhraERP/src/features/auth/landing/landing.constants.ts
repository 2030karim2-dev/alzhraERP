import { Package, FileText, Users, BarChart3, Shield, Zap, type LucideIcon } from 'lucide-react';

// ── Contact ──
/** Business contact email used across the landing sections — single source of truth. */
export const LANDING_CONTACT_EMAIL = '2030.krim2@gmail.com';

// ── Features ──
export interface LandingFeature {
  icon: LucideIcon;
  title: string;
  desc: string;
  color: string;
}

export const LANDING_FEATURES: LandingFeature[] = [
  {
    icon: Package,
    title: 'إدارة مخزون دقيقة',
    desc: 'تتبع الأصناف ومواقعها مع تنبيهات تلقائية بالأصناف التي أوشكت على النفاد وتقارير النقص.',
    color: 'blue',
  },
  {
    icon: FileText,
    title: 'نظام فواتير متكامل',
    desc: 'أصدر فواتير ضريبية، عروض أسعار، وفواتير مرتجعات بسرعة مع دعم كامل لقارئ الباركود.',
    color: 'blue',
  },
  {
    icon: Users,
    title: 'إدارة العملاء والموردين',
    desc: 'قاعدة بيانات شاملة مع تتبع الحسابات الآجلة والمدفوعات ومطابقة الأرصدة بدقة.',
    color: 'blue',
  },
  {
    icon: BarChart3,
    title: 'تقارير وشاشات تحليلية',
    desc: 'متابعة المبيعات والأرباح اليومية والشهرية من خلال لوحات بيانات تفاعلية ومؤشرات أداء.',
    color: 'blue',
  },
  {
    icon: Shield,
    title: 'أمان ونسخ احتياطي',
    desc: 'بيانات مشفرة ومحمية مع نسخ احتياطي منتظم لضمان استمرارية أعمالك بلا انقطاع.',
    color: 'blue',
  },
  {
    icon: Zap,
    title: 'مساعد ذكي للعمليات',
    desc: 'أدوات ذكية لتسريع إدخال البيانات واقتراح كميات الشراء المثالية بناءً على حركة البيع.',
    color: 'blue',
  },
];

export const FEATURE_COLORS = new Map<string, string>([
  [
    'blue',
    'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40',
  ],
  [
    'emerald',
    'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40',
  ],
  [
    'orange',
    'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/40',
  ],
  [
    'purple',
    'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40',
  ],
  [
    'indigo',
    'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40',
  ],
  [
    'amber',
    'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40',
  ],
]);

// ── How It Works ──
export interface LandingStep {
  step: number;
  title: string;
  desc: string;
}

export const LANDING_STEPS: LandingStep[] = [
  {
    step: 1,
    title: 'أنشئ حسابك',
    desc: 'سجل بيانات محلك واختر الثيم المناسب لهويتك التجارية في ثوانٍ معدودة.',
  },
  {
    step: 2,
    title: 'أدخل مخزونك',
    desc: 'ارفع ملفات الإكسيل الخاصة بقطع الغيار أو ابدأ الإدخال بالباركود الذكي.',
  },
  {
    step: 3,
    title: 'ابدأ البيع',
    desc: 'أصدر فواتيرك الاحترافية وتابع مبيعاتك لحظة بلحظة من أي جهاز.',
  },
];

// ── Pricing ──
export interface LandingPricingPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  popular: boolean;
  features: string[];
  ctaText: string;
  accent: string;
}

export const LANDING_PRICING_PLANS: LandingPricingPlan[] = [
  {
    id: 'free',
    name: 'الباقة المجانية',
    price: '0',
    period: 'شهرياً',
    description: 'مثالية للمحلات الصغيرة للبدء في رقمنة العمليات الأساسية',
    popular: false,
    features: [
      'إدارة مخزون أساسية (حتى 500 صنف)',
      'إصدار 50 فاتورة شهرياً',
      'إدارة حتى 100 عميل',
      'تقارير يومية أساسية',
      'دعم فني عبر البريد الإلكتروني',
    ],
    ctaText: 'ابدأ مجاناً',
    accent: 'gray',
  },
  {
    id: 'professional',
    name: 'الباقة الاحترافية',
    price: '29',
    period: 'شهرياً',
    description: 'للمحلات المتوسطة والنامية التي تحتاج أدوات متقدمة',
    popular: true,
    features: [
      'مخزون غير محدود الأصناف',
      'فواتير غير محدودة',
      'عملاء وموردين غير محدودين',
      'نظام محاسبة كامل',
      'تقارير متقدمة ولوحات تحليلية',
      'نقطة بيع POS كاملة',
      'دعم فني مباشر 24/7',
      'نسخ احتياطي يومي تلقائي',
    ],
    ctaText: 'ابدأ النسخة التجريبية',
    accent: 'blue',
  },
  {
    id: 'enterprise',
    name: 'باقة المؤسسات',
    price: '99',
    period: 'شهرياً',
    description: 'للمؤسسات الكبيرة متعددة الفروع مع احتياجات مخصصة',
    popular: false,
    features: [
      'كل مميزات الباقة الاحترافية',
      'إدارة فروع متعددة',
      'صلاحيات متقدمة للموظفين',
      'تقارير مخصصة حسب الطلب',
      'تكامل API مع أنظمتك',
      'مساعد ذكاء اصطناعي متقدم',
      'مدير حساب مخصص',
      'تدريب مباشر للفريق',
    ],
    ctaText: 'اتصل بالمبيعات',
    accent: 'purple',
  },
];

// ── Testimonials ──
export interface LandingTestimonial {
  name: string;
  role: string;
  company: string;
  location: string;
  rating: number;
  text: string;
  avatarColor: string;
}

export const LANDING_TESTIMONIALS: LandingTestimonial[] = [
  {
    name: 'أحمد محمد',
    role: 'مالك',
    company: 'مركز السلام لقطع الغيار',
    location: 'صنعاء',
    rating: 5,
    text: 'نظام الزهراء غير طريقة إدارتنا للمخزون بالكامل. صرنا نعرف بالضبط كل قطعة وين موقعها وكم كميتها. وفر علينا وقت وجهد كبير جداً.',
    avatarColor: 'bg-blue-500',
  },
  {
    name: 'خالد العمري',
    role: 'مدير',
    company: 'مؤسسة العمري التجارية',
    location: 'المكلا',
    rating: 5,
    text: 'أفضل نظام ERP عربي جربته. السهولة في إصدار الفواتير وتتبع المدفوعات شيء لا يوصف. أنصح به كل صاحب محل قطع غيار.',
    avatarColor: 'bg-emerald-500',
  },
  {
    name: 'سامي الحسني',
    role: 'محاسب',
    company: 'شركة الحسني للسيارات',
    location: 'تعز',
    rating: 5,
    text: 'النظام المحاسبي دقيق جداً وسهل الاستخدام. التقارير المالية صارت تطلع بضغطة زر. وفّر علينا أيام من الشغل اليدوي.',
    avatarColor: 'bg-amber-500',
  },
  {
    name: 'ناصر باحميد',
    role: 'مالك',
    company: 'محلات باحميد لقطع الغيار',
    location: 'المهرة',
    rating: 4,
    text: 'التطبيق سهل وبسيط. أكثر شيء عجبني نظام الباركود ونقطة البيع. حتى الموظفين الجدد يتعلموه بسرعة بدون تعقيد.',
    avatarColor: 'bg-purple-500',
  },
  {
    name: 'فاطمة الجابري',
    role: 'مديرة مالية',
    company: 'مجموعة الجابري',
    location: 'عدن',
    rating: 5,
    text: 'نظام متكامل بمعنى الكلمة. من المخزون للمبيعات للمحاسبة، كل شيء مربوط ببعض. الدعم الفني ممتاز وسريع الاستجابة.',
    avatarColor: 'bg-rose-500',
  },
];

// ── FAQ ──
export interface LandingFAQ {
  question: string;
  answer: string;
}

export const LANDING_FAQS: LandingFAQ[] = [
  {
    question: 'كيف يمكنني البدء باستخدام نظام الزهراء؟',
    answer:
      'العملية بسيطة جداً! سجل حساب جديد من أعلى الصفحة، ثم ابدأ بإدخال أصناف مخزونك (يمكنك رفع ملف Excel مباشرة)، وبعدها ابدأ في إصدار الفواتير وإدارة عملياتك اليومية.',
  },
  {
    question: 'هل أحتاج إلى تثبيت أي برامج على جهازي؟',
    answer:
      'لا تحتاج أي تثبيت! نظام الزهراء هو تطبيق سحابي يعمل بالكامل من المتصفح. يمكنك الوصول إليه من أي جهاز طالما لديك اتصال بالإنترنت.',
  },
  {
    question: 'هل بياناتي آمنة؟',
    answer:
      'بالتأكيد! نستخدم أعلى معايير الأمان: تشفير SSL/TLS لنقل البيانات، وخوارزميات تشفير متطورة لتخزينها، مع نسخ احتياطي يومي تلقائي.',
  },
  {
    question: 'هل يدعم النظام الفروع المتعددة؟',
    answer:
      'نعم! الباقة المؤسسية تدعم إدارة فروع متعددة مع صلاحيات منفصلة لكل فرع، وتقارير مجمعة أو مفصلة لكل فرع على حدة.',
  },
  {
    question: 'كيف يعمل الدعم الفني؟',
    answer:
      'نقدم دعماً متعدد القنوات: محادثة مباشرة داخل التطبيق، بريد إلكتروني، وواتساب للباقات المدفوعة. كما نوفر فيديوهات تعليمية شاملة.',
  },
  {
    question: 'هل يمكنني تجربة النظام قبل الدفع؟',
    answer:
      'طبعاً! نوفر باقة مجانية بالكامل بـ 500 صنف و50 فاتورة شهرياً. وعندما تكبر احتياجاتك، يمكنك الترقية في أي وقت.',
  },
  {
    question: 'هل يدعم النظام الفوترة الضريبية؟',
    answer:
      'نعم، النظام يدعم فواتير ضريبية متوافقة مع متطلبات هيئة الزكاة والضريبة والجمارك، مع إضافة الرقم الضريبي تلقائياً.',
  },
  {
    question: 'هل يمكنني استيراد بياناتي من نظام آخر؟',
    answer:
      'نعم! أداة الاستيراد الذكي تقبل ملفات Excel وCSV لمعالجة الأصناف والعملاء والموردين مع التحقق من عدم التكرار.',
  },
  {
    question: 'ماذا يحدث إذا انقطع الإنترنت أثناء العمل؟',
    answer:
      'النظام يعمل بتقنية التخزين المؤقت — يمكنك متابعة العمل بدون إنترنت، وعند عودة الاتصال تتم المزامنة تلقائياً.',
  },
  {
    question: 'هل يمكنني تخصيص مظهر النظام؟',
    answer:
      'نعم! أكثر من 40 ثيماً احترافياً مع إمكانية تخصيص الألوان والخطوط والخلفيات لتناسب هويتك التجارية بالكامل.',
  },
];

// ── Trusted By ──
export const LANDING_TRUSTED_BY = [
  'مركز السلام',
  'مؤسسة العمري',
  'الحسني للسيارات',
  'باحميد لقطع الغيار',
  'مجموعة الجابري',
  'المركز العربي',
  'الشركة اليمنية',
  'مؤسسة النور',
  'دار البركة',
  'مركز الإخلاص',
  'مؤسسة الوفاء',
  'العهد الجديد',
];

// ── Hero Stats ──
export const LANDING_HERO_STATS = [
  { label: 'عميل نشط', value: 1200, suffix: '+' },
  { label: 'فاتورة منجزة', value: 45, suffix: 'K+' },
  { label: 'قطعة مدارة', value: 250, suffix: 'K+' },
];
