/**
 * Auto Parts Catalogs Directory & Helper Utilities
 * Contains supported external OEM & aftermarket catalog portals.
 */

export interface AutoPartsCatalog {
  id: string;
  nameAr: string;
  nameEn: string;
  badge: string;
  domain: string;
  baseUrl: string;
  searchByPartUrl: (partNumber: string) => string;
  searchByVinUrl?: (vin: string) => string;
  colorClass: {
    bg: string;
    text: string;
    border: string;
    hoverBg: string;
  };
  description: string;
  supportsVin: boolean;
}

export const AUTO_PARTS_CATALOGS: AutoPartsCatalog[] = [
  {
    id: 'megazip',
    nameAr: 'ميجازيب (Megazip)',
    nameEn: 'Megazip',
    badge: '🇯🇵 أصلي ياباني وعالمي',
    domain: 'megazip.net',
    baseUrl: 'https://www.megazip.net/',
    searchByPartUrl: (q) => `https://www.megazip.net/zapchasti-dlya/?q=${encodeURIComponent(q.trim())}`,
    searchByVinUrl: (vin) => `https://www.megazip.net/zapchasti-dlya/?q=${encodeURIComponent(vin.trim())}`,
    colorClass: {
      bg: 'bg-purple-50 dark:bg-purple-950/40',
      text: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-200 dark:border-purple-800',
      hoverBg: 'hover:bg-purple-100 dark:hover:bg-purple-900/50',
    },
    description: 'كتالوج ياباني وعالمي ضخم لقطع الغيار الأصلية ومخططات الانفجار (Diagrams)',
    supportsVin: true,
  },
  {
    id: 'partsouq',
    nameAr: 'بارت سوق (PartSouq)',
    nameEn: 'PartSouq',
    badge: '🇦🇪 دبي / الخليج - أصلي OEM',
    domain: 'partsouq.com',
    baseUrl: 'https://partsouq.com/',
    searchByPartUrl: (q) => `https://partsouq.com/en/search/all?q=${encodeURIComponent(q.trim())}`,
    searchByVinUrl: (vin) => `https://partsouq.com/en/catalog/genuine/locate?c=${encodeURIComponent(vin.trim())}`,
    colorClass: {
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800',
      hoverBg: 'hover:bg-blue-100 dark:hover:bg-blue-900/50',
    },
    description: 'أشهر كتالوج للسيارات الخليجية والأمريكية واليابانية برقم الشاصي والقطعة',
    supportsVin: true,
  },
  {
    id: 'spareto',
    nameAr: 'سباريتو (Spareto)',
    nameEn: 'Spareto',
    badge: '🇪🇺 أوروبي أصلي وبديل',
    domain: 'spareto.com',
    baseUrl: 'https://spareto.com/',
    searchByPartUrl: (q) => `https://spareto.com/products?utf8=%E2%9C%93&keywords=${encodeURIComponent(q.trim())}`,
    colorClass: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800',
      hoverBg: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/50',
    },
    description: 'كتالوج أوروبي مميز للبحث عن بدائل القطع والمصنعين (OEM & Aftermarket)',
    supportsVin: false,
  },
  {
    id: 'autodoc',
    nameAr: 'أوتودوك (Autodoc)',
    nameEn: 'Autodoc',
    badge: '🇩🇪 عالمي / ألماني',
    domain: 'autodoc.parts',
    baseUrl: 'https://www.autodoc.parts/',
    searchByPartUrl: (q) => `https://www.autodoc.parts/search?keyword=${encodeURIComponent(q.trim())}`,
    colorClass: {
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800',
      hoverBg: 'hover:bg-amber-100 dark:hover:bg-amber-900/50',
    },
    description: 'أكبر متجر وكتالوج لقطع غيار السيارات في أوروبا مع تفاصيل التوافق والأبعاد',
    supportsVin: false,
  },
  {
    id: 'amayama',
    nameAr: 'أماياما (Amayama)',
    nameEn: 'Amayama',
    badge: '🇯🇵 أصلي ياباني مباشر',
    domain: 'amayama.com',
    baseUrl: 'https://www.amayama.com/',
    searchByPartUrl: (q) => `https://www.amayama.com/en/search?q=${encodeURIComponent(q.trim())}`,
    searchByVinUrl: (vin) => `https://www.amayama.com/en/search?q=${encodeURIComponent(vin.trim())}`,
    colorClass: {
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      text: 'text-rose-700 dark:text-rose-300',
      border: 'border-rose-200 dark:border-rose-800',
      hoverBg: 'hover:bg-rose-100 dark:hover:bg-rose-900/50',
    },
    description: 'كتالوج قطع أصلية يابانية لسيارات تويوتا، نيسان، ميتسوبيشي وهوندا',
    supportsVin: true,
  },
];

/** Open external catalog search for a part number in a new tab */
export function openCatalogSearch(catalogId: string, query: string): void {
  const catalog = AUTO_PARTS_CATALOGS.find((c) => c.id === catalogId) || AUTO_PARTS_CATALOGS[0];
  if (!query.trim()) {
    window.open(catalog.baseUrl, '_blank', 'noopener,noreferrer');
    return;
  }
  const url = catalog.searchByPartUrl(query);
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** Open external catalog search for a VIN in a new tab */
export function openCatalogVinSearch(catalogId: string, vin: string): void {
  const catalog = AUTO_PARTS_CATALOGS.find((c) => c.id === catalogId) || AUTO_PARTS_CATALOGS[0];
  if (!vin.trim()) {
    window.open(catalog.baseUrl, '_blank', 'noopener,noreferrer');
    return;
  }
  const url = catalog.searchByVinUrl ? catalog.searchByVinUrl(vin) : catalog.searchByPartUrl(vin);
  window.open(url, '_blank', 'noopener,noreferrer');
}
