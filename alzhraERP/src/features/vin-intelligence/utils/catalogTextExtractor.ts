/**
 * Smart Catalog Text & PartSouq / EPC Raw Parser
 *
 * Cleans, sanitizes, and extracts structured vehicle specs from raw text copied
 * from automotive portals (PartSouq, Amayama, Megazip, ToyoDIY, RockAuto, EPC Data, etc.).
 *
 * Eliminates markdown links, HTML noise, table headers, and squished key-value blocks.
 */

import { canonicalizeMake, canonicalizeModel } from './vehicleCanonicalizer';

export interface ExtractedCatalogVehicle {
  rawText: string;
  vin?: string | null;
  make?: string | null;
  makeAr?: string | null;
  model?: string | null;
  modelAr?: string | null;
  modelCode?: string | null;
  modelShort?: string | null;
  year?: string | null;
  yearStart?: string | null;
  yearEnd?: string | null;
  productionDate?: string | null;
  productionRange?: string | null;
  engine?: string | null;
  colorCode?: string | null;
  trimCode?: string | null;
  grade?: string | null;
  market?: string | null;
  transmission?: string | null;
  drive?: string | null;
  body?: string | null;
  confidenceScore: number;
  extractedFieldsCount: number;
}

const KNOWN_MAKES: Record<string, { en: string; ar: string }> = {
  TOYOTA: { en: 'Toyota', ar: 'تويوتا' },
  LEXUS: { en: 'Lexus', ar: 'لكزس' },
  NISSAN: { en: 'Nissan', ar: 'نيسان' },
  INFINITI: { en: 'Infiniti', ar: 'إنفينيتي' },
  HYUNDAI: { en: 'Hyundai', ar: 'هيونداي' },
  KIA: { en: 'Kia', ar: 'كيا' },
  GENESIS: { en: 'Genesis', ar: 'جينيسيس' },
  HONDA: { en: 'Honda', ar: 'هوندا' },
  MITSUBISHI: { en: 'Mitsubishi', ar: 'ميتسوبيشي' },
  MAZDA: { en: 'Mazda', ar: 'مازدا' },
  ISUZU: { en: 'Isuzu', ar: 'إيسوزو' },
  SUZUKI: { en: 'Suzuki', ar: 'سوزوكي' },
  SUBARU: { en: 'Subaru', ar: 'سوبارو' },
  FORD: { en: 'Ford', ar: 'فورد' },
  CHEVROLET: { en: 'Chevrolet', ar: 'شفروليه' },
  GMC: { en: 'GMC', ar: 'جمس' },
  CADILLAC: { en: 'Cadillac', ar: 'كاديلاك' },
  DODGE: { en: 'Dodge', ar: 'دودج' },
  JEEP: { en: 'Jeep', ar: 'جيب' },
  CHRYSLER: { en: 'Chrysler', ar: 'كرايسلر' },
  MERCEDES: { en: 'Mercedes-Benz', ar: 'مرسيدس' },
  BMW: { en: 'BMW', ar: 'بي إم دبليو' },
  AUDI: { en: 'Audi', ar: 'أودي' },
  VOLKSWAGEN: { en: 'Volkswagen', ar: 'فولكس واجن' },
  PORSCHE: { en: 'Porsche', ar: 'بورش' },
  LAND_ROVER: { en: 'Land Rover', ar: 'لاند روفر' },
  RANGE_ROVER: { en: 'Range Rover', ar: 'رينج روفر' },
  GEELY: { en: 'Geely', ar: 'جيلي' },
  MG: { en: 'MG', ar: 'إم جي' },
  CHANGAN: { en: 'Changan', ar: 'شانجان' },
  HAVAL: { en: 'Haval', ar: 'هافال' },
  CHERy: { en: 'Chery', ar: 'شيري' },
};

/** Normalizes market strings to standard portal dropdown categories */
export const normalizeMarketCategory = (rawMarket: string): string => {
  const norm = rawMarket.trim().toLowerCase();
  if (
    norm.includes('jp') ||
    norm.includes('japan') ||
    norm.includes('domestic') ||
    norm.includes('ياباني')
  ) {
    return 'ياباني';
  }
  if (
    norm.includes('gcc') ||
    norm.includes('gulf') ||
    norm.includes('خليج') ||
    norm.includes('دول الخليج') ||
    norm.includes('me') ||
    norm.includes('middle east') ||
    norm.includes('ar') ||
    norm.includes('general')
  ) {
    return 'خليجي';
  }
  if (
    norm.includes('us') ||
    norm.includes('usa') ||
    norm.includes('america') ||
    norm.includes('أمريك') ||
    norm.includes('امريك') ||
    norm.includes('na') ||
    norm.includes('ca')
  ) {
    return 'أمريكي';
  }
  if (
    norm.includes('eu') ||
    norm.includes('europe') ||
    norm.includes('أوروب') ||
    norm.includes('اوروب') ||
    norm.includes('uk')
  ) {
    return 'أوروبي';
  }
  if (norm.includes('kor') || norm.includes('korea') || norm.includes('كور')) {
    return 'كوري';
  }
  return 'خليجي';
};

/** Cleans engine string from verbose catalog titles (e.g. "TB48DE TYPE ENGINE" -> "TB48DE") */
const cleanEngineCode = (raw: string): string => {
  return raw
    .replace(/(?:TYPE ENGINE|TYPE ENG|ENGINE TYPE|ENGINE|المحرك|كود المحرك|TYPE|محرك)/gi, '')
    .trim();
};

/** Normalizes transmission text */
const cleanTransmission = (raw: string): string => {
  if (/يدوي|عادي|manual|mtm/i.test(raw)) return 'عادي';
  if (/أوتوماتيك|اوتوماتيك|تماتيك|auto|atm|cvt/i.test(raw)) return 'تماتيك';
  return raw.trim();
};

/**
 * Extracts key-value mappings from vertical matrix blocks (e.g. Afyal / Nissan / Toyota EPC catalogs)
 * where headers list is followed by matching values list.
 */
const parseMatrixKeyValueBlock = (text: string): Record<string, string> => {
  const result: Record<string, string> = {};
  const rawLines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  // Clean lines: strip markdown link wrappers [val](url) -> val
  const lines = rawLines.map(l => {
    const md = l.match(/^\[(.*?)\](?:\(.*?\))?$/);
    return md ? md[1].trim() : l;
  });

  const HEADER_KEYS = [
    'الماركة',
    'الموديل',
    'سنة الموديل',
    'سنة الصنع',
    'السنة',
    'هيكل المركبة',
    'المحرك',
    'المنطقة',
    'السوق',
    'susp',
    'الفئة',
    'ناقل الحركة',
    'الجير',
    'make',
    'model',
    'year',
    'body',
    'engine',
    'region',
    'market',
    'grade',
    'transmission',
    'modelcode',
    'model code',
    'details',
  ];

  for (let i = 0; i < lines.length; i++) {
    if (HEADER_KEYS.some(k => k.toLowerCase() === lines[i].toLowerCase())) {
      const headers: string[] = [];
      let j = i;
      while (
        j < lines.length &&
        HEADER_KEYS.some(k => k.toLowerCase() === lines[j].toLowerCase())
      ) {
        headers.push(lines[j]);
        j++;
      }

      if (headers.length >= 3 && j < lines.length) {
        for (let k = 0; k < headers.length && j + k < lines.length; k++) {
          const header = headers[k];
          const val = lines[j + k];
          result[header] = val;
        }
        break;
      }
    }
  }

  return result;
};

/**
 * Parses raw catalog clipboard text and returns structured vehicle specifications
 */
export const parseCatalogVehicleText = (rawInput: string): ExtractedCatalogVehicle => {
  if (!rawInput || !rawInput.trim()) {
    return {
      rawText: '',
      confidenceScore: 0,
      extractedFieldsCount: 0,
    };
  }

  const text = rawInput.trim();
  const matrix = parseMatrixKeyValueBlock(text);

  let vin: string | null = null;
  let make: string | null = null;
  let makeAr: string | null = null;
  let model: string | null = null;
  let modelAr: string | null = null;
  let modelCode: string | null = null;
  let modelShort: string | null = null;
  let year: string | null = null;
  let yearStart: string | null = null;
  let yearEnd: string | null = null;
  let productionDate: string | null = null;
  let productionRange: string | null = null;
  let engine: string | null = null;
  let colorCode: string | null = null;
  let trimCode: string | null = null;
  let grade: string | null = null;
  let market: string | null = null;
  let transmission: string | null = null;
  let drive: string | null = null;
  let body: string | null = null;

  // 1. Extract VIN / Frame Number
  const vinPatterns = [
    /\[VIN:\s*([A-Z0-9-]{7,17})\]/i,
    /(?:[?&]vin=|\/vin\/|\/search\/)([A-Z0-9-]{7,17})/i,
    /(?:VIN|Frame|Chassis|شاصي|رقم الشاصي|الهيكل)[:\s#]*([A-Z0-9-]{7,17})/i,
    /(?:^|\n)\s*([A-HJ-NPR-Z0-9]{17})\s*(?:\n|$)/i,
    /(?:^|\n)\s*([A-Z0-9-]{9,17})\s*(?:\n|$)/i,
  ];

  for (const pat of vinPatterns) {
    const match = text.match(pat);
    if (match && match[1] && match[1].length >= 7) {
      vin = match[1].trim().toUpperCase();
      break;
    }
  }

  // 2. Extract Make (Manufacturer)
  // Check URLs (/catalog/toyota/) or text mentions
  for (const [key, val] of Object.entries(KNOWN_MAKES)) {
    const regex = new RegExp(`\\b(${key}|${val.en}|${val.ar})\\b`, 'i');
    if (regex.test(text)) {
      make = val.en;
      makeAr = val.ar;
      break;
    }
  }

  // Fallback make from canonicalizer
  if (!make) {
    const canon = canonicalizeMake(text);
    if (canon) {
      make = canon;
      makeAr = KNOWN_MAKES[canon.toUpperCase()]?.ar || canon;
    }
  }

  // 3. Extract Model Code (e.g., ZRR75G-APXEP, URJ200L-GNZEKV, GUN125L-DTFLXV, MD11, TB17)
  const modelCodeMatch =
    text.match(
      /(?:ModelCode|Model Code|Frame Code|كود الموديل)[:\s]*([A-Z0-9]{3,8}-[A-Z0-9]{4,8})/i
    ) ||
    text.match(/\[([A-Z0-9]{3,8}-[A-Z0-9]{4,8})\]/i) ||
    text.match(/\b([A-Z0-9]{3,8}-[A-Z0-9]{4,8})\b/);

  if (modelCodeMatch && modelCodeMatch[1]) {
    modelCode = modelCodeMatch[1].trim().toUpperCase();
  }

  // 4. Extract Model Short / Frame Prefix (e.g. ZRR75, URJ200, GUN125, NZE141)
  const modelShortMatch = text.match(
    /(?:Model Short|ModelShort|Frame No|Short Model)[:\s]*([A-Z0-9]{3,8}?)(?=(?:Production|Prod|Trim|Color|Grade|Engine|\s|$))/i
  );
  if (modelShortMatch && modelShortMatch[1]) {
    modelShort = modelShortMatch[1].trim().toUpperCase();
  } else if (modelCode) {
    const prefix = modelCode.split('-')[0];
    if (prefix) modelShort = prefix.replace(/[A-Z]+$/, '');
  }

  // 5. Extract Model Name
  // A. Try Markdown link breadcrumbs: iterate all [Label](URL) links
  const mdLinkRegex = /\[([^\]]+)\]\((?:https?:\/\/[^)]+)\)/g;
  let linkMatch;
  while ((linkMatch = mdLinkRegex.exec(text)) !== null) {
    const label = linkMatch[1].trim();

    // Check if URL indicates a model segment: e.g. /2011/NOAH-VOXY or /model/COROLLA
    if (
      !label.startsWith('VIN') &&
      !label.startsWith('http') &&
      !/^\d{4}$/.test(label) &&
      label.toLowerCase() !== 'japan' &&
      label.toLowerCase() !== 'arch' &&
      label.toLowerCase() !== 'vehicle' &&
      label.toLowerCase() !== 'region' &&
      label.toLowerCase() !== 'search' &&
      label !== modelCode &&
      !label.includes('catalog')
    ) {
      model = label;
    }
  }

  // B. Try Header Pattern: "Toyota Parts Catalogs NOAH VOXY 2011" or "[Make] Parts Catalogs [Model] [Year]"
  if (!model) {
    const headerMatch = text.match(
      /(?:Toyota|Lexus|Nissan|Hyundai|Kia|Honda|Mitsubishi|Ford|Chevrolet|Mazda|Isuzu)?\s*(?:Parts\s+Catalogs|Parts\s+Catalog|Catalog)\s+([A-Z0-9\s/-]{2,30}?)(?:\s+\d{4}|\s+Region|\s+ModelCode|\n|$)/i
    );
    if (headerMatch && headerMatch[1]) {
      const cand = headerMatch[1].trim();
      if (cand && !cand.toLowerCase().includes('catalog')) {
        model = cand;
      }
    }
  }

  // C. Try Tabular Structure (PartSouq style):
  // Headers: Region \n Year \n Model \n ModelCode \n Details
  // Values: Japan \n 2011 \n NOAH VOXY \n ZRR75G-APXEP
  if (!model) {
    const lines = text
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);
    const modelIdx = lines.findIndex(l => /^Model$/i.test(l));
    if (modelIdx !== -1) {
      // Find the headers block
      const detailsIdx = lines.findIndex((l, i) => i > modelIdx && /^Details$/i.test(l));
      if (detailsIdx !== -1) {
        const offset =
          modelIdx -
          lines.findIndex(l => /^Region$/i.test(l) || /^Year$/i.test(l) || l === lines[modelIdx]);
        // The value corresponding to Model is at detailsIdx + offset + 1
        const candidateValue = lines[detailsIdx + 1 + offset] || lines[detailsIdx + 3];
        if (
          candidateValue &&
          !candidateValue.startsWith('Color') &&
          !candidateValue.startsWith('Engine')
        ) {
          model = candidateValue;
        }
      }
    }
  }

  // D. Try explicit "Model: NOAH VOXY"
  if (!model) {
    const explicitMatch = text.match(/(?:^|\n)(?:Model|الطراز|الموديل)[:\s]+([^\n\r]+)/i);
    if (explicitMatch && explicitMatch[1]) {
      const cand = explicitMatch[1]
        .replace(/(?:ModelCode|Model Code|Details|Year|Color|Engine).*$/i, '')
        .trim();
      if (cand && cand.toLowerCase() !== 'modelcode' && cand.toLowerCase() !== 'details') {
        model = cand;
      }
    }
  }

  // Canonicalize Model if found
  if (model) {
    const canon = canonicalizeModel(model, make || 'Toyota');
    if (canon) {
      model = canon;
    }
  }

  // Apply Matrix values if present
  if (matrix['الماركة'] || matrix['Make']) {
    const rawM = matrix['الماركة'] || matrix['Make'];
    for (const [key, val] of Object.entries(KNOWN_MAKES)) {
      if (
        key.toLowerCase() === rawM.toLowerCase() ||
        val.en.toLowerCase() === rawM.toLowerCase() ||
        val.ar === rawM
      ) {
        make = val.en;
        makeAr = val.ar;
        break;
      }
    }
  }

  if (matrix['الموديل'] || matrix['Model']) {
    model = matrix['الموديل'] || matrix['Model'];
  }

  if (matrix['سنة الموديل'] || matrix['سنة الصنع'] || matrix['السنة'] || matrix['Year']) {
    year = matrix['سنة الموديل'] || matrix['سنة الصنع'] || matrix['السنة'] || matrix['Year'];
    if (!yearStart) yearStart = year;
    if (!yearEnd) yearEnd = year;
  }

  if (matrix['هيكل المركبة'] || matrix['Body']) {
    body = matrix['هيكل المركبة'] || matrix['Body'];
  }

  if (matrix['المحرك'] || matrix['Engine']) {
    engine = cleanEngineCode(matrix['المحرك'] || matrix['Engine']);
  }

  if (matrix['المنطقة'] || matrix['السوق'] || matrix['Region'] || matrix['Market']) {
    market = normalizeMarketCategory(
      matrix['المنطقة'] || matrix['السوق'] || matrix['Region'] || matrix['Market']
    );
  }

  if (matrix['ناقل الحركة'] || matrix['الجير'] || matrix['Transmission']) {
    transmission = cleanTransmission(
      matrix['ناقل الحركة'] || matrix['الجير'] || matrix['Transmission']
    );
  }

  if (matrix['الفئة'] || matrix['Grade']) {
    grade = matrix['الفئة'] || matrix['Grade'];
  }

  // 6. Extract Production Date and Range
  // Example: "Production Date: 2011-10" or "Production: 2010-04 » 2014-01" or "(04/2010 - 01/2014)"
  const prodDateMatch = text.match(
    /(?:Production Date|Prod Date|Date of manufacture|تاريخ الإنتاج)[:\s]*([0-9]{4}[-/.][0-9]{2}(?:[-/.][0-9]{2})?)/i
  );
  if (prodDateMatch && prodDateMatch[1]) {
    productionDate = prodDateMatch[1].replace(/[/.]/g, '-').trim();
    const yr = productionDate.slice(0, 4);
    if (/^\d{4}$/.test(yr)) {
      year = yr;
    }
  }

  const prodRangeMatch =
    text.match(
      /(?:Production|فترة الإنتاج|Period)[:\s]*([0-9]{4}[-/.][0-9]{2})\s*(?:»|-|to|\.\.)\s*([0-9]{4}[-/.][0-9]{2})/i
    ) || text.match(/\(([0-9]{2}[/.][0-9]{4})\s*-\s*([0-9]{2}[/.][0-9]{4})\)/);

  if (prodRangeMatch && prodRangeMatch[1] && prodRangeMatch[2]) {
    let start = prodRangeMatch[1].trim();
    let end = prodRangeMatch[2].trim();

    // Convert MM/YYYY to YYYY-MM if needed
    if (/^\d{2}\/\d{4}$/.test(start)) {
      const parts = start.split('/');
      start = `${parts[1]}-${parts[0]}`;
    }
    if (/^\d{2}\/\d{4}$/.test(end)) {
      const parts = end.split('/');
      end = `${parts[1]}-${parts[0]}`;
    }

    productionRange = `${start} » ${end}`;
    yearStart = start.slice(0, 4);
    yearEnd = end.slice(0, 4);
  }

  // 7. Extract Specific Year if not found yet
  if (!year) {
    const yearMatch =
      text.match(/\[(\d{4})\]/) ||
      text.match(/(?:^|\n)(?:Year|السنة|عام)[:\s]+(\d{4})\b/i) ||
      text.match(/\b(19\d{2}|20\d{2})\b/);

    if (yearMatch && yearMatch[1]) {
      year = yearMatch[1].trim();
    }
  }

  if (!yearStart && year) yearStart = year;
  if (!yearEnd && year) yearEnd = year;

  // 8. Extract Engine (e.g. Engine: 3ZRFA, 2TRFE, 1GRFE, 3ZR-FAE, 3URFE (5.7L V8), 2.0L, 1.8L)
  if (!engine) {
    const engineMatch = text.match(
      /(?:Engine|المحرك|كود المحرك)[:\s]*([^\n\r]+?)(?=(?:Production Date|Production|Color Code|Color|Grade Description|Grade|Trim Code|Trim|Model Short|ModelShort|\n|$))/i
    );
    if (engineMatch && engineMatch[1]) {
      engine = cleanEngineCode(engineMatch[1]);
    }
  }

  // 9. Extract Color Code (e.g. Color Code: 070, 1D6, 202, 040)
  const colorMatch = text.match(
    /(?:Color Code|Color|كود اللون|رمز اللون)[:\s]*([A-Z0-9]{2,6}?)(?=(?:Engine|Production|Trim|Grade|Model|\s|$))/i
  );
  if (colorMatch && colorMatch[1]) {
    colorCode = colorMatch[1].trim().toUpperCase();
  }

  // 10. Extract Trim Code / Interior (e.g. Trim Code: FA41, FC20, LA10)
  const trimMatch = text.match(
    /(?:Trim Code|Trim|كود الفرش|رمز الداخلية)[:\s]*([A-Z0-9]{2,6}?)(?=(?:Color|Engine|Production|Grade|Model|\s|$))/i
  );
  if (trimMatch && trimMatch[1]) {
    trimCode = trimMatch[1].trim().toUpperCase();
  }

  // 11. Extract Grade Description / Trim (e.g. Grade Description: X TYPE, TX-L, G, V)
  if (!grade) {
    const gradeMatch = text.match(
      /(?:Grade Description|Grade|الفئة)[:\s]*([^\n\r]+?)(?=(?:Model Short|Production|Trim|Color|Engine|$))/i
    );
    if (gradeMatch && gradeMatch[1]) {
      grade = gradeMatch[1].trim();
    }
  }

  // 12. Extract Market / Region (e.g. Japan, GCC, Europe, USA)
  if (!market) {
    const marketMatch =
      text.match(/\[(Japan|GCC|General|Europe|USA|North America|Middle East)\]/i) ||
      text.match(
        /(?:Region|Market|السوق|المنطقة)[:\s]*\n?(Japan|GCC|General|Europe|USA|North America|Middle East|JP|EU|US)\b/i
      );
    if (marketMatch && marketMatch[1]) {
      market = normalizeMarketCategory(marketMatch[1]);
    } else if (text.toLowerCase().includes('japan') || text.includes('/region/jp')) {
      market = 'ياباني';
    } else if (
      text.toLowerCase().includes('gcc') ||
      text.toLowerCase().includes('general') ||
      text.includes('خليج')
    ) {
      market = 'خليجي';
    } else {
      market = 'خليجي';
    }
  }

  // 13. Transmission & Drive heuristics
  if (!drive) {
    if (
      text.match(/(?:4WD|AWD|4X4|دبل)/i) ||
      (model && /سافاري|باترول|شاص|لاندكروزر|برادو|safari|patrol/i.test(model)) ||
      (body && /pick up|بيك اب/i.test(body) && (make === 'Nissan' || make === 'Toyota'))
    ) {
      drive = 'دبل';
    } else if (text.match(/(?:2WD|FWD|RHD|سنجل|دفع أمامي|دفع خلفي)/i)) {
      drive = 'سنجل';
    } else {
      drive = 'دبل';
    }
  }

  if (!transmission) {
    if (text.match(/(?:ATM|CVT|AUTOMATIC|AUTO|تماتيك|أوتوماتيك)/i)) {
      transmission = 'تماتيك';
    } else if (text.match(/(?:MTM|MANUAL|عادي|يدوي)/i)) {
      transmission = 'عادي';
    } else {
      transmission = 'عادي';
    }
  }

  // Calculate score and count
  const fields = [
    vin,
    make,
    model,
    modelCode,
    yearStart,
    engine,
    colorCode,
    trimCode,
    grade,
    market,
  ];
  const extractedFieldsCount = fields.filter(Boolean).length;
  const confidenceScore = Math.min(100, Math.round((extractedFieldsCount / 8) * 100));

  return {
    rawText: text,
    vin,
    make: make || 'Toyota',
    makeAr: makeAr || 'تويوتا',
    model: model || null,
    modelAr: modelAr || null,
    modelCode,
    modelShort,
    year,
    yearStart: yearStart || year,
    yearEnd: yearEnd || year,
    productionDate,
    productionRange,
    engine,
    colorCode,
    trimCode,
    grade,
    market,
    transmission: transmission || 'تماتيك',
    drive: drive || 'سنجل',
    body,
    confidenceScore,
    extractedFieldsCount,
  };
};
