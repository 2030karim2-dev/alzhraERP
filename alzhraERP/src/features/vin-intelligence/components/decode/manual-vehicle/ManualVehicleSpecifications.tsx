import React from 'react';
import { YearsCard } from './YearsCard';
import { EngineCard } from './EngineCard';
import { DrivetrainCard } from './DrivetrainCard';
import { MarketVinCard } from './MarketVinCard';
import type { ManualVehicleFieldsProps } from './types';

/** شبكة بطاقات المواصفات: سنوات، مكينة، جير ودفع، وارد وشاصي. */
export function ManualVehicleSpecifications({
  draft,
  onChange,
}: ManualVehicleFieldsProps): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
      <YearsCard draft={draft} onChange={onChange} />
      <EngineCard draft={draft} onChange={onChange} />
      <DrivetrainCard draft={draft} onChange={onChange} />
      <MarketVinCard draft={draft} onChange={onChange} />
    </div>
  );
}
