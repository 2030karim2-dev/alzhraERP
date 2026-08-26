/**
 * Canonical vehicle make/model identifiers.
 *
 * Audit fix (M1): VinDecodeTab's manual path used to persist Arabic
 * brands/models («تويوتا», «كورولا») while ManualVinModal persisted
 * canonical English ('Toyota', 'Corolla'). Inventory matching compares
 * `lower(vehicle_make)` strings, so the two spellings never met — parts
 * went unlinkable and the vehicles catalog fragmented per spelling.
 *
 * These aliases mirror migration 20260826000002 (which repairs stored
 * data); this module normalizes everything entered AFTER it shipped.
 * Mirror any dictionary change in BOTH places.
 */

/** Arabic/transliterated variants not already canonical → canonical id */
export const MAKE_ALIASES: Readonly<Record<string, string>> = {
  'تويوتا': 'Toyota',
  'لكزس': 'Lexus',
  'نيسان': 'Nissan',
  'إنفينيتي': 'Infiniti',
  'هيونداي': 'Hyundai',
  'كيا': 'Kia',
  'هوندا': 'Honda',
  'ميتسوبيشي': 'Mitsubishi',
  'مازدا': 'Mazda',
  'ايسوزو': 'Isuzu',
  'إيسوزو': 'Isuzu',
  'سوزوكي': 'Suzuki',
  'فورد': 'Ford',
  'شفروليه': 'Chevrolet',
  'شيفروليه': 'Chevrolet',
  'جمس': 'GMC',
  'مرسيدس': 'Mercedes-Benz',
  'مرسيدس بنز': 'Mercedes-Benz',
  'بي ام دبليو': 'BMW',
  'فولكس فاجن': 'Volkswagen',
  'أودي': 'Audi',
};

const MODEL_ALIASES: Readonly<Record<string, string>> = {
  'كورولا': 'Corolla',
  'كامري': 'Camry',
  'يارس': 'Yaris',
  'فيتز': 'Vitz',
  'باسو': 'Passo',
  'راف فور': 'RAV4',
  'هايلوكس': 'Hilux',
  'شاص': 'Land Cruiser 70',
  'لاندكروزر': 'Land Cruiser',
  'برادو': 'Prado',
  'راش': 'Rush',
  'بريوس': 'Prius',
  'هايس': 'Hiace',
  'باترول': 'Patrol',
  'صني': 'Sunny',
  'ألتيما': 'Altima',
  'مكسيما': 'Maxima',
  'أكسنت': 'Accent',
  'إلنترا': 'Elantra',
  'سوناتا': 'Sonata',
  'توسان': 'Tucson',
  'سنتافي': 'Santa Fe',
  'سيراتو': 'Cerato',
  'سبورتاج': 'Sportage',
  'سورينتو': 'Sorento',
  'بيجاس': 'Pegas',
  'سيفيك': 'Civic',
  'أكورد': 'Accord',
  'ديماكس': 'D-Max',
  'باجيرو': 'Pajero',
  'لانسر': 'Lancer',
  'كانتر': 'Canter',
  'جراند فيتارا': 'Grand Vitara',
  'فيترا': 'Vitara',
};

function lookupAlias(dict: Readonly<Record<string, string>>, value?: string | null): string {
  return dict[value?.trim().toLowerCase() ?? ''] ?? '';
}

/**
 * Returns the canonical make for an Arabic/transliterated input;
 * unknown inputs pass through trimmed (they may be valid English or a
 * rare brand the dictionary does not know).
 */
export function canonicalizeMake(make?: string | null): string {
  const alias = lookupAlias(MAKE_ALIASES, make);
  if (alias) return alias;
  return (make ?? '').trim();
}

/**
 * Returns the canonical model for an input under the GIVEN make.
 * Model translation is applied only when the make is canonical
 * (`Toyota`) so identical strings across unrelated brands stay intact.
 */
export function canonicalizeModel(model?: string | null, _make?: string | null): string {
  const alias = lookupAlias(MODEL_ALIASES, model);
  if (alias) return alias;
  return (model ?? '').trim();
}