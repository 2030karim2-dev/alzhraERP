import {
  canonicalizeMake,
  canonicalizeModel,
  normalizeToEnglishNumbers,
} from '../../../utils/vehicleCanonicalizer';
import { getArabicVehicleName } from '../../../utils/smartPartNamer';
import type { ManualVehicleDraft } from './types';

export interface VehiclePreviewModel {
  titleAr: string;
  titleEn: string;
  yearsLabel: string;
  engine: string;
  market: string;
  trans: string;
  drive: string;
}

/** يبني تسمية نطاق السنوات مرتبة تصاعدياً (نفس منطق المعاينة الأصلية). */
export function buildYearsLabel(yearStart: string, yearEnd: string): string {
  const yStart = parseInt(normalizeToEnglishNumbers(yearStart).replace(/\D/g, ''), 10);
  const yEnd = parseInt(normalizeToEnglishNumbers(yearEnd).replace(/\D/g, ''), 10);
  const hasStart = !isNaN(yStart) && yStart > 0;
  const hasEnd = !isNaN(yEnd) && yEnd > 0;
  if (hasStart && hasEnd) {
    const min = String(Math.min(yStart, yEnd));
    const max = String(Math.max(yStart, yEnd));
    return yStart === yEnd ? min : `${min} - ${max}`;
  }
  return hasStart ? String(yStart) : '';
}

export type PreviewDraft = Omit<ManualVehicleDraft, 'vinOptional'>;

/** يبني هوية السيارة المستهدفة للمعاينة، أو null عند غياب الماركة. */
export function buildPreviewModel(draft: PreviewDraft): VehiclePreviewModel | null {
  if (draft.make.trim().length === 0) return null;
  const effMake = canonicalizeMake(draft.make) || draft.make.trim();
  const effModel = canonicalizeModel(draft.model.trim(), effMake) || draft.model.trim();
  const arabicNames = getArabicVehicleName({ make: effMake, model: effModel });
  return {
    titleAr: `${arabicNames.makeAr} ${arabicNames.modelAr}`.trim(),
    titleEn: `${effMake} ${effModel}`.trim(),
    yearsLabel: buildYearsLabel(draft.yearStart, draft.yearEnd),
    engine: draft.engine.length > 0 ? `${draft.engine}L` : '',
    market: draft.market.length > 0 ? draft.market : 'خليجي',
    trans: draft.transmission.length > 0 ? draft.transmission : 'تماتيك',
    drive: draft.drive.length > 0 ? draft.drive : 'سنجل',
  };
}
