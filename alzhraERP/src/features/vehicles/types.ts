export interface PartEntry {
    id: string;
    partNumber: string;
    nameAr: string;
    nameEn: string;
    brand: string;
    source: string;
    action: 'new' | 'cross_ref' | 'fitment';
    linkedProductId?: string;
    linkedProductName?: string;
}
