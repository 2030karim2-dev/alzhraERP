/* eslint-disable @typescript-eslint/array-type */
import type { DocumentFontFamily } from '@/core/types/documentHeader';

export const AVAILABLE_FONTS: { id: DocumentFontFamily; name: string }[] = [
  { id: 'Cairo', name: 'خط كايرو (Cairo)' },
  { id: 'Almarai', name: 'خط المراعي (Almarai)' },
  { id: 'Tajawal', name: 'خط تجوال (Tajawal)' },
  { id: 'Alexandria', name: 'خط الإسكندرية (Alexandria)' },
  { id: 'IBM Plex Sans Arabic', name: 'خط IBM Plex عربي' },
  { id: 'Amiri', name: 'خط أميري تقليدي (Amiri)' },
  { id: 'Arial', name: 'أريال القياسي (Arial)' },
];

export const PRESET_ACCENT_COLORS = [
  { name: 'أزرق كلاسيكي', color: '#2563eb' },
  { name: 'كحلي وقار', color: '#1e3a8a' },
  { name: 'زمردي راقي', color: '#059669' },
  { name: 'عنابي فاخر', color: '#991b1b' },
  { name: 'عنبري دافئ', color: '#d97706' },
  { name: 'بنفسجي ملكي', color: '#7c3aed' },
  { name: 'رمادي داكن', color: '#334155' },
];

export type PreviewTab = 'sales_invoice' | 'purchase_invoice' | 'bond' | 'statement' | 'whatsapp';
export type StudioActiveTab = 'design' | 'typography' | 'logo' | 'details' | 'whatsapp';
