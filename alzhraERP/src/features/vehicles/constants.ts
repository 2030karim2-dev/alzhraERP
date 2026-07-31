// بيانات المواقع الخارجية
export const EXTERNAL_SITES = [
    {
        id: 'partsouq',
        name: 'PartsOuq',
        nameAr: 'بارتس سوق',
        description: 'أكبر منصة لقطع غيار السيارات الأصلية والبديلة في الشرق الأوسط',
        url: 'https://partsouq.com',
        searchUrl: (vin: string) => `https://partsouq.com/en/catalog/genuine/search?q=${vin}`,
        logo: '🔧',
        color: 'from-orange-500 to-amber-500',
        bgColor: 'bg-orange-50 dark:bg-orange-950/30',
        borderColor: 'border-orange-200 dark:border-orange-800',
        textColor: 'text-orange-700 dark:text-orange-400',
        supported: ['Toyota', 'Lexus', 'Nissan', 'Honda', 'Hyundai', 'Kia', 'Mitsubishi'],
    },
    {
        id: 'afyal',
        name: 'Afyal',
        nameAr: 'أفيال',
        description: 'منصة سعودية رائدة لبيع قطع غيار السيارات وملحقاتها',
        url: 'https://afyal.com',
        searchUrl: (vin: string) => `https://afyal.com/search?q=${vin}`,
        logo: '🏪',
        color: 'from-emerald-500 to-teal-500',
        bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
        borderColor: 'border-emerald-200 dark:border-emerald-800',
        textColor: 'text-emerald-700 dark:text-emerald-400',
        supported: ['جميع الماركات'],
    },
    {
        id: 'toyodiy',
        name: 'ToyoDIY',
        nameAr: 'تويو دي آي واي',
        description: 'قاعدة بيانات متخصصة في قطع غيار تويوتا ولكزس مع الرسوم التوضيحية',
        url: 'https://www.toyodiy.com',
        searchUrl: (vin: string) => `https://www.toyodiy.com/parts/q?vin=${vin}`,
        logo: '🚗',
        color: 'from-red-500 to-rose-500',
        bgColor: 'bg-red-50 dark:bg-red-950/30',
        borderColor: 'border-red-200 dark:border-red-800',
        textColor: 'text-red-700 dark:text-red-400',
        supported: ['Toyota', 'Lexus'],
    }
];

// فك تشفير VIN
export const decodeVinBasic = (vin: string) => {
    if (!vin || vin.length < 17) return null;
    const wmi = vin.substring(0, 3);
    const makeMap: Record<string, { make: string; country: string }> = {
        'JTD': { make: 'Toyota', country: 'اليابان' }, 'JTE': { make: 'Toyota', country: 'اليابان' },
        'JTM': { make: 'Toyota', country: 'اليابان' }, 'JTH': { make: 'Lexus', country: 'اليابان' },
        'JN1': { make: 'Nissan', country: 'اليابان' }, 'JHM': { make: 'Honda', country: 'اليابان' },
        'KMH': { make: 'Hyundai', country: 'كوريا' }, 'KNA': { make: 'Kia', country: 'كوريا' },
        '5TD': { make: 'Toyota', country: 'أمريكا' }, '4T1': { make: 'Toyota', country: 'أمريكا' },
        '2T1': { make: 'Toyota', country: 'كندا' }, 'WBA': { make: 'BMW', country: 'ألمانيا' },
        'WDB': { make: 'Mercedes-Benz', country: 'ألمانيا' }, 'WAU': { make: 'Audi', country: 'ألمانيا' },
        'SAL': { make: 'Land Rover', country: 'بريطانيا' }, 'ZAR': { make: 'Alfa Romeo', country: 'إيطاليا' },
    };
    const yearChar = vin[9];
    const yearMap: Record<string, number> = {
        'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014, 'F': 2015, 'G': 2016,
        'H': 2017, 'J': 2018, 'K': 2019, 'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023,
        'R': 2024, 'S': 2025, 'T': 2026,
    };
    const info = makeMap[wmi] || { make: 'غير معروف', country: 'غير محدد' };
    const year = yearMap[yearChar] || 2020;
    return { make: info.make, country: info.country, year, wmi, vds: vin.substring(3, 9), vis: vin.substring(9), raw: vin };
};
