import type { ExtractedCatalogVehicle } from '../../../utils/catalogTextExtractor';
import type { ManualVehicleDraft } from './types';
import { hasValue } from './shared';

function appendSpecs(patch: Partial<ManualVehicleDraft>, data: ExtractedCatalogVehicle): void {
  if (hasValue(data.model)) patch.model = data.model;
  if (hasValue(data.yearStart)) patch.yearStart = data.yearStart;
  if (hasValue(data.yearEnd)) patch.yearEnd = data.yearEnd;
  if (hasValue(data.market)) patch.market = data.market;
  if (hasValue(data.engine)) patch.engine = data.engine;
  if (hasValue(data.transmission)) patch.transmission = data.transmission;
  if (hasValue(data.drive)) patch.drive = data.drive;
  if (hasValue(data.vin)) patch.vinOptional = data.vin;
}

/**
 * يحوّل بيانات الكتالوج المستخلصة إلى رقعة تحديث للنموذج.
 * تُطبَّق الحقول الحاضرة فقط، والماركة العربية تتقدم على الإنجليزية،
 * والشاصي يُسقط على vinOptional.
 */
export function buildDraftPatch(data: ExtractedCatalogVehicle): Partial<ManualVehicleDraft> {
  const patch: Partial<ManualVehicleDraft> = {};
  const makeValue = hasValue(data.makeAr) ? data.makeAr : data.make;
  if (hasValue(makeValue)) patch.make = makeValue;
  appendSpecs(patch, data);
  return patch;
}
