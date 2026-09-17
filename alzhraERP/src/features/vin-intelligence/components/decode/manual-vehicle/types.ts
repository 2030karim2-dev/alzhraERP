/** حقول نموذج إدخال السيارة اليدوي — مجمّعة في كائن واحد بدلاً من 17 prop مفردة. */
export interface ManualVehicleDraft {
  make: string;
  model: string;
  yearStart: string;
  yearEnd: string;
  market: string;
  engine: string;
  transmission: string;
  drive: string;
  vinOptional: string;
}

/** Controlled values only; catalog state stays in its own section. */
export interface ManualVehicleFieldsProps<
  K extends keyof ManualVehicleDraft = keyof ManualVehicleDraft,
> {
  draft: Pick<ManualVehicleDraft, K>;
  onChange: (patch: Partial<ManualVehicleDraft>) => void;
}
