/**
 * vinRowHelpers.ts
 * Pure row-normalization helpers shared by the VIN/parts tabs
 * (VinsTab, PartsExtractTab) to keep a single source of truth for
 * how grid/part rows are normalised before being added to inventory
 * or a quotation. All functions are pure and remain under the
 * complexity-10 ceiling.
 */
import type {
  ExcelGridPart,
  VehicleInfo,
  PartIntelligenceResult,
  PartAlternative,
  ExtractedPart,
} from '../types';

/** Preferred base part name: `baseName` wins, falls back to `description`. */
export const pickBaseName = (part: Partial<ExcelGridPart>): string =>
  (part.baseName ?? '') || (part.description ?? '');

/** Preferred manufacturer: explicit field wins, falls back to vehicle make. */
export const pickManufacturer = (
  part: { manufacturer?: string },
  vehicle: VehicleInfo | null
): string => (part.manufacturer ?? '') || (vehicle?.make ?? '');

/** Normalise an optional numeric price to a safe number (default 0). */
export const pickPrice = (value: number | undefined): number => value ?? 0;

/** Preferred part display name: description wins, falls back to part number. */
export const pickPartName = (p: { description?: string; partNumber: string }): string =>
  (p.description ?? '') || p.partNumber;

/** Preferred alternative manufacturer: brand → intelligence mfr → vehicle make. */
export const pickAltManufacturer = (
  alt: PartAlternative,
  intel: PartIntelligenceResult | null,
  vehicle: VehicleInfo | null
): string => (alt.brand ?? '') || (intel?.manufacturer ?? '') || (vehicle?.make ?? '');

/**
 * Builds the final Arabic description shown to the user, appending the size
 * spec when it adds information not already present.
 */
export const buildFinalDescription = (r: {
  description?: string;
  baseName: string;
  sizeSpec?: string;
}): string => {
  let desc = (r.description ?? '').trim() || r.baseName.trim() || 'قطعة غيار';
  const sizeSpec = r.sizeSpec?.trim() ?? '';
  if (sizeSpec.length > 0 && !desc.includes(sizeSpec)) {
    desc = `${desc} - ${sizeSpec}`;
  }
  return desc;
};

/**
 * Normalises a raw `ExtractedPart` (from catalog search) into the
 * grid-level `ExcelGridPart` shape used by the parts extraction tabs.
 */
export const extractedPartToGridPart = (
  p: ExtractedPart,
  vehicle: VehicleInfo | null,
  smartBaseName: string
): ExcelGridPart => ({
  _id: `mz-${String(Date.now())}-${Math.random().toString(36).substring(2, 8)}`,
  partNumber: p.partNumber,
  baseName: smartBaseName,
  description: smartBaseName,
  manufacturer: pickManufacturer(p, vehicle),
  source: p.source,
  salePrice: pickPrice(p.salePrice),
  purchasePrice: pickPrice(p.purchasePrice),
  selected: true,
});
