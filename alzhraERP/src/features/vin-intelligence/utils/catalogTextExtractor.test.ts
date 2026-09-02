import { describe, it, expect } from 'vitest';
import { parseCatalogVehicleText } from './catalogTextExtractor';

describe('catalogTextExtractor', () => {
  it('correctly parses user PartSouq sample with all fields', () => {
    const rawInput = `
[arch](https://partsouq.com/en/catalog/toyota/search)
[VIN: ZRR750086287](https://partsouq.com/en/catalog/toyota/search/ZRR750086287)
[Japan](https://partsouq.com/en/catalog/toyota/search/region/JP?vin=ZRR750086287)
[2011](https://partsouq.com/en/catalog/toyota/search/JP/2011?vin=ZRR750086287)
[NOAH VOXY](https://partsouq.com/en/catalog/toyota/search/JP/2011/NOAH-VOXY?vin=ZRR750086287)
[ZRR75G-APXEP](https://partsouq.com/en/catalog/toyota/search/JP/2011/NOAH-VOXY/ZRR75G-APXEP?vin=ZRR750086287)
Vehicle
Toyota Parts Catalogs NOAH VOXY 2011
Region
Year
Model
ModelCode
Details
Japan
2011
NOAH VOXY
ZRR75G-APXEP
Color Code: 070Engine: 3ZRFAProduction Date: 2011-10Grade Description: X TYPEModel Short: ZRR75Production: 2010-04 » 2014-01Trim Code: FA41
`;

    const result = parseCatalogVehicleText(rawInput);

    expect(result.vin).toBe('ZRR750086287');
    expect(result.make).toBe('Toyota');
    expect(result.makeAr).toBe('تويوتا');
    expect(result.model).toContain('NOAH');
    expect(result.modelCode).toBe('ZRR75G-APXEP');
    expect(result.modelShort).toBe('ZRR75');
    expect(result.colorCode).toBe('070');
    expect(result.trimCode).toBe('FA41');
    expect(result.engine).toBe('3ZRFA');
    expect(result.grade).toBe('X TYPE');
    expect(result.productionDate).toBe('2011-10');
    expect(result.productionRange).toBe('2010-04 » 2014-01');
    expect(result.yearStart).toBe('2010');
    expect(result.yearEnd).toBe('2014');
    expect(result.market).toBe('ياباني');
    expect(result.extractedFieldsCount).toBeGreaterThanOrEqual(7);
  });

  it('correctly parses Land Cruiser catalog paste', () => {
    const rawInput = `
Toyota Parts Catalogs LAND CRUISER 2016
VIN: URJ2000123456
Model Code: URJ200L-GNZEKV
Engine: 3URFE (5.7L V8)
Color Code: 070
Trim Code: LB41
Market: GCC
Production Date: 2016-03
Grade: VX-R
`;

    const result = parseCatalogVehicleText(rawInput);

    expect(result.vin).toBe('URJ2000123456');
    expect(result.make).toBe('Toyota');
    expect(result.model).toBe('LAND CRUISER');
    expect(result.modelCode).toBe('URJ200L-GNZEKV');
    expect(result.engine).toBe('3URFE (5.7L V8)');
    expect(result.colorCode).toBe('070');
    expect(result.trimCode).toBe('LB41');
    expect(result.market).toBe('خليجي');
    expect(result.grade).toBe('VX-R');
  });

  it('handles empty or malformed strings gracefully', () => {
    const result = parseCatalogVehicleText('');
    expect(result.extractedFieldsCount).toBe(0);
    expect(result.confidenceScore).toBe(0);
  });
});
