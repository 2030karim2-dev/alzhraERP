/* eslint-disable complexity, max-lines-per-function, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unnecessary-type-conversion, @typescript-eslint/restrict-template-expressions, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unnecessary-condition */
import React from 'react';
import type { DocumentHeaderConfig, LogoSize } from '@/core/types/documentHeader';
import { DEFAULT_DOCUMENT_HEADER_CONFIG } from '@/core/types/documentHeader';

export interface UniversalDocumentHeaderProps {
  config?: DocumentHeaderConfig;
  company?: {
    name?: string | undefined;
    logo_url?: string | undefined;
    phone?: string | undefined;
    email?: string | undefined;
    address?: string | undefined;
    tax_number?: string | undefined;
    commercial_register?: string | undefined;
    slogan?: string | undefined;
  };
  documentTitle?: string | undefined;
  documentNumber?: string | undefined;
  documentDate?: string | undefined;
  className?: string | undefined;
}

const LOGO_SIZE_CLASSES: Record<LogoSize, { img: string; maxH: number }> = {
  small: { img: 'h-12 w-auto max-w-[100px]', maxH: 48 },
  medium: { img: 'h-16 w-auto max-w-[140px]', maxH: 64 },
  large: { img: 'h-20 w-auto max-w-[180px]', maxH: 80 },
  xlarge: { img: 'h-24 w-auto max-w-[220px]', maxH: 96 },
};

export const UniversalDocumentHeader: React.FC<UniversalDocumentHeaderProps> = ({
  config = DEFAULT_DOCUMENT_HEADER_CONFIG,
  company = {},
  documentTitle,
  documentNumber,
  documentDate,
  className = '',
}) => {
  const { typography, logo, banner, details, style } = config;

  // Resolve values (priority: config overrides -> company record -> fallback)
  const resolvedCompanyName =
    details.companyNameOverride?.trim() || company.name?.trim() || 'اسم المنشأة';

  const resolvedSlogan = details.sloganText?.trim() || company.slogan?.trim() || '';
  const resolvedPhone = company.phone?.trim() || '';
  const resolvedEmail = company.email?.trim() || '';
  const resolvedAddress = company.address?.trim() || '';
  const resolvedTaxNumber = company.tax_number?.trim() || '';
  const resolvedCommercialRegister = company.commercial_register?.trim() || '';
  const resolvedLogoUrl = logo.logoUrl?.trim() || company.logo_url?.trim() || '';

  // Safe font sizes (enforcing AGENTS.md rule: >= 10px)
  const safeTitleSize = Math.max(12, Number(typography.titleSize) || 20);
  const safeDetailsSize = Math.max(10, Number(typography.detailsSize) || 11);

  // If full-banner mode is active and banner url exists
  if (banner.enabled && banner.bannerUrl) {
    return (
      <header
        className={`w-full overflow-hidden print:w-full ${className}`}
        style={{
          borderBottom: style.showDivider
            ? `${style.borderWidth}px solid ${style.borderColor}`
            : 'none',
        }}
      >
        <img
          src={banner.bannerUrl}
          alt={resolvedCompanyName}
          style={{
            height: `${banner.height}px`,
            objectFit: banner.objectFit,
            width: '100%',
          }}
          className="block w-full"
        />
        {documentTitle && (
          <div
            className="flex items-center justify-between border-b px-4 py-2"
            style={{
              borderColor: style.borderColor,
              backgroundColor: style.backgroundColor,
            }}
          >
            <h2
              style={{
                fontFamily: typography.titleFont,
                color: style.accentColor,
                fontSize: `${safeTitleSize * 0.85}px`,
              }}
              className="font-bold"
            >
              {documentTitle}
            </h2>
            {(documentNumber || documentDate) && (
              <div
                className="flex items-center gap-3 text-xs text-slate-600"
                style={{ fontFamily: typography.detailsFont }}
              >
                {documentNumber && <span>رقم: {documentNumber}</span>}
                {documentDate && <span>التاريخ: {documentDate}</span>}
              </div>
            )}
          </div>
        )}
      </header>
    );
  }

  // Common Typography Styles
  const titleStyle: React.CSSProperties = {
    fontFamily: typography.titleFont,
    fontSize: `${safeTitleSize}px`,
    fontWeight: typography.titleBold ? 700 : 500,
    color: typography.titleColor || '#0f172a',
  };

  const detailsStyle: React.CSSProperties = {
    fontFamily: typography.detailsFont,
    fontSize: `${safeDetailsSize}px`,
    fontWeight: typography.detailsBold ? 600 : 400,
    color: typography.detailsColor || '#475569',
    lineHeight: 1.5,
  };

  // Logo Element
  const renderLogo = () => {
    if (!logo.showLogo || !resolvedLogoUrl) return null;
    const sizeConfig = LOGO_SIZE_CLASSES[logo.size] || LOGO_SIZE_CLASSES.medium;

    return (
      <div className="flex flex-shrink-0 items-center justify-center">
        <img
          src={resolvedLogoUrl}
          alt={resolvedCompanyName}
          className={`${sizeConfig.img} object-contain transition-all`}
          style={{
            maxHeight: logo.customWidth ? undefined : `${sizeConfig.maxH}px`,
            width: logo.customWidth ? `${logo.customWidth}px` : undefined,
            borderRadius: `${logo.borderRadius ?? 8}px`,
          }}
        />
      </div>
    );
  };

  // Details List
  const renderDetails = (align: 'right' | 'left' | 'center' = 'right') => {
    const alignClass =
      align === 'center'
        ? 'items-center text-center'
        : align === 'left'
          ? 'items-start text-left'
          : 'items-start text-right';

    return (
      <div className={`flex flex-col gap-0.5 ${alignClass}`} style={detailsStyle}>
        {details.showSlogan && resolvedSlogan && (
          <p className="mb-0.5 italic text-slate-500">{resolvedSlogan}</p>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {details.showTaxNumber && resolvedTaxNumber && (
            <span>
              <strong className="text-slate-700">
                {details.taxNumberLabel || 'الرقم الضريبي'}:
              </strong>{' '}
              <bdo dir="ltr">{resolvedTaxNumber}</bdo>
            </span>
          )}

          {details.showCommercialRegister && resolvedCommercialRegister && (
            <span>
              <strong className="text-slate-700">
                {details.commercialRegisterLabel || 'السجل التجاري'}:
              </strong>{' '}
              <bdo dir="ltr">{resolvedCommercialRegister}</bdo>
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {details.showPhone && resolvedPhone && (
            <span>
              <strong className="text-slate-700">{details.phoneLabel || 'الهاتف'}:</strong>{' '}
              <bdo dir="ltr">{resolvedPhone}</bdo>
            </span>
          )}

          {details.showEmail && resolvedEmail && (
            <span>
              <strong className="text-slate-700">البريد:</strong> {resolvedEmail}
            </span>
          )}
        </div>

        {details.showAddress && resolvedAddress && (
          <p className="max-w-lg truncate text-slate-600">{resolvedAddress}</p>
        )}

        {details.showCustomNote && details.customNoteText && (
          <p className="mt-0.5 text-[10px] text-slate-500">{details.customNoteText}</p>
        )}
      </div>
    );
  };

  // Document Badge (Title, Number, Date)
  const renderDocumentBadge = () => {
    if (!documentTitle && !documentNumber && !documentDate) return null;

    return (
      <div
        className="flex flex-shrink-0 flex-col items-center justify-center rounded-lg border px-4 py-2 sm:items-end"
        style={{
          borderColor: style.borderColor,
          backgroundColor: '#f8fafc',
          fontFamily: typography.detailsFont,
        }}
      >
        {documentTitle && (
          <div
            className="mb-1 font-bold tracking-wide"
            style={{
              color: style.accentColor,
              fontSize: `${Math.max(14, safeTitleSize * 0.75)}px`,
            }}
          >
            {documentTitle}
          </div>
        )}
        {documentNumber && (
          <div
            className="text-xs font-semibold text-slate-700"
            style={{ fontSize: `${safeDetailsSize}px` }}
          >
            <span>رقم: </span>
            <span className="font-mono text-slate-900">{documentNumber}</span>
          </div>
        )}
        {documentDate && (
          <div
            className="mt-0.5 text-xs text-slate-500"
            style={{ fontSize: `${Math.max(10, safeDetailsSize - 1)}px` }}
          >
            <span>التاريخ: </span>
            <bdo dir="ltr">{documentDate}</bdo>
          </div>
        )}
      </div>
    );
  };

  return (
    <header
      className={`relative w-full transition-colors ${className}`}
      style={{
        backgroundColor: style.backgroundColor || '#ffffff',
        borderBottom: style.showDivider
          ? `${style.borderWidth}px solid ${style.borderColor || '#e2e8f0'}`
          : 'none',
        paddingTop: `${style.paddingY}px`,
        paddingBottom: `${style.paddingY}px`,
      }}
    >
      {/* Decorative top accent bar */}
      <div
        className="absolute left-0 right-0 top-0 h-1"
        style={{ backgroundColor: style.accentColor }}
      />

      {/* Layout Variant: Modern Centered */}
      {style.layout === 'modern-centered' && (
        <div className="flex flex-col items-center gap-3 px-4 text-center">
          {logo.position === 'center' && renderLogo()}
          <div className="flex w-full items-center justify-center gap-4">
            {logo.position === 'right' && renderLogo()}
            <div className="flex flex-col items-center">
              {details.showCompanyName && (
                <h1 style={titleStyle} className="leading-tight">
                  {resolvedCompanyName}
                </h1>
              )}
              {renderDetails('center')}
            </div>
            {logo.position === 'left' && renderLogo()}
          </div>
          {renderDocumentBadge()}
        </div>
      )}

      {/* Layout Variant: Compact Minimal */}
      {style.layout === 'compact-minimal' && (
        <div className="flex items-center justify-between gap-4 px-3">
          <div className="flex items-center gap-3">
            {renderLogo()}
            <div>
              {details.showCompanyName && (
                <h1 style={{ ...titleStyle, fontSize: `${safeTitleSize * 0.9}px` }}>
                  {resolvedCompanyName}
                </h1>
              )}
              <div
                className="mt-0.5 flex items-center gap-3 text-xs text-slate-600"
                style={detailsStyle}
              >
                {details.showPhone && resolvedPhone && <span>هاتف: {resolvedPhone}</span>}
                {details.showTaxNumber && resolvedTaxNumber && (
                  <span>ضريبي: {resolvedTaxNumber}</span>
                )}
              </div>
            </div>
          </div>
          {renderDocumentBadge()}
        </div>
      )}

      {/* Layout Variant: Classic Split (Default) */}
      {(style.layout === 'classic-split' || !style.layout) && (
        <div className="flex flex-col items-start justify-between gap-4 px-4 sm:flex-row sm:items-center">
          {/* Right Side: Logo & Main Info */}
          <div className="flex items-center gap-4">
            {logo.position !== 'left' && renderLogo()}
            <div className="flex flex-col">
              {details.showCompanyName && (
                <h1 style={titleStyle} className="mb-1 leading-snug">
                  {resolvedCompanyName}
                </h1>
              )}
              {renderDetails('right')}
            </div>
          </div>

          {/* Left Side: Document Badge or Left Logo */}
          <div className="flex items-center gap-4 self-end sm:self-center">
            {renderDocumentBadge()}
            {logo.position === 'left' && renderLogo()}
          </div>
        </div>
      )}
    </header>
  );
};
