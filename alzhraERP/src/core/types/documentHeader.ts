export type DocumentHeaderLayout =
  'modern-centered' | 'classic-split' | 'full-banner' | 'compact-minimal';

export type DocumentFontFamily =
  | 'Cairo'
  | 'Tajawal'
  | 'Almarai'
  | 'Alexandria'
  | 'IBM Plex Sans Arabic'
  | 'Amiri'
  | 'Arial'
  | 'inherit';

export type LogoPosition = 'right' | 'center' | 'left';
export type LogoSize = 'small' | 'medium' | 'large' | 'xlarge';

export interface DocumentHeaderTypography {
  titleFont: DocumentFontFamily;
  titleSize: number; // in pixels (e.g. 18 to 32)
  titleBold: boolean;
  titleColor: string;

  detailsFont: DocumentFontFamily;
  detailsSize: number; // in pixels (e.g. 11 to 16, must be >= 10)
  detailsBold: boolean;
  detailsColor: string;
}

export interface DocumentHeaderLogoConfig {
  showLogo: boolean;
  logoUrl?: string;
  position: LogoPosition;
  size: LogoSize;
  customWidth?: number; // optional custom width in px
  borderRadius?: number; // 0 for square, 8 for rounded, 9999 for circle
}

export interface DocumentHeaderBannerConfig {
  enabled: boolean;
  bannerUrl?: string;
  height: number; // e.g. 120px
  objectFit: 'cover' | 'contain' | 'fill';
}

export interface DocumentHeaderDetailsConfig {
  showCompanyName: boolean;
  companyNameOverride?: string;

  showSlogan: boolean;
  sloganText?: string;

  showTaxNumber: boolean;
  taxNumberLabel?: string;

  showCommercialRegister: boolean;
  commercialRegisterLabel?: string;

  showPhone: boolean;
  phoneLabel?: string;

  showEmail: boolean;
  showAddress: boolean;

  showCustomNote: boolean;
  customNoteText?: string;
}

export interface DocumentHeaderStyleConfig {
  layout: DocumentHeaderLayout;
  accentColor: string;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number; // 0, 1, 2, 3, 4
  showDivider: boolean;
  paddingY: number; // padding in px (e.g. 12 to 32)
}

export interface WhatsappHeaderConfig {
  includeCompanyName: boolean;
  includeSlogan: boolean;
  includeContact: boolean;
  includeTaxNumber: boolean;
  dividerStyle: 'stars' | 'dashes' | 'emojis' | 'none';
  customGreeting?: string;
}

export interface DocumentHeaderConfig {
  version: number;
  lastUpdated: string;
  isTemplateAppliedToAll: boolean;

  typography: DocumentHeaderTypography;
  logo: DocumentHeaderLogoConfig;
  banner: DocumentHeaderBannerConfig;
  details: DocumentHeaderDetailsConfig;
  style: DocumentHeaderStyleConfig;
  whatsapp: WhatsappHeaderConfig;
}

export const DEFAULT_DOCUMENT_HEADER_CONFIG: DocumentHeaderConfig = {
  version: 1,
  lastUpdated: new Date().toISOString(),
  isTemplateAppliedToAll: true,

  typography: {
    titleFont: 'Cairo',
    titleSize: 22,
    titleBold: true,
    titleColor: '#1e293b', // slate-800

    detailsFont: 'Cairo',
    detailsSize: 12,
    detailsBold: false,
    detailsColor: '#475569', // slate-600
  },

  logo: {
    showLogo: true,
    logoUrl: '',
    position: 'right',
    size: 'medium',
    borderRadius: 8,
  },

  banner: {
    enabled: false,
    bannerUrl: '',
    height: 120,
    objectFit: 'cover',
  },

  details: {
    showCompanyName: true,
    companyNameOverride: '',
    showSlogan: true,
    sloganText: '',
    showTaxNumber: true,
    taxNumberLabel: 'الرقم الضريبي',
    showCommercialRegister: true,
    commercialRegisterLabel: 'السجل التجاري',
    showPhone: true,
    phoneLabel: 'الهاتف',
    showEmail: false,
    showAddress: true,
    showCustomNote: false,
    customNoteText: '',
  },

  style: {
    layout: 'classic-split',
    accentColor: '#2563eb', // blue-600
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1', // slate-300
    borderWidth: 1,
    showDivider: true,
    paddingY: 16,
  },

  whatsapp: {
    includeCompanyName: true,
    includeSlogan: false,
    includeContact: true,
    includeTaxNumber: false,
    dividerStyle: 'stars',
    customGreeting: '',
  },
};
