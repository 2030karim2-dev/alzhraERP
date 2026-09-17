import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { generateZatcaBase64 } from '../../../../core/utils/zatca';
import { logger } from '../../../../core/utils/logger';

interface ZatcaInvoiceQRCodeProps {
  sellerName: string;
  vatNumber: string;
  timestamp: string;
  totalAmount: number | string;
  vatAmount: number | string;
  size?: number;
  className?: string;
}

export const ZatcaInvoiceQRCode: React.FC<ZatcaInvoiceQRCodeProps> = ({
  sellerName,
  vatNumber,
  timestamp,
  totalAmount,
  vatAmount,
  size = 110,
  className = '',
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function generateCode() {
      try {
        const cleanSeller = (sellerName || 'المنشأة').trim();
        const cleanVat = (vatNumber || '300000000000003').trim();
        const cleanTotal = Number(totalAmount || 0).toFixed(2);
        const cleanVatAmount = Number(vatAmount || 0).toFixed(2);
        const cleanDate = timestamp || new Date().toISOString();

        const base64TLV = generateZatcaBase64(
          cleanSeller,
          cleanVat,
          cleanDate,
          cleanTotal,
          cleanVatAmount
        );

        const dataUrl = await QRCode.toDataURL(base64TLV, {
          width: size,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'M',
        });

        if (isMounted) {
          setQrDataUrl(dataUrl);
        }
      } catch (err) {
        logger.error('ZatcaInvoiceQRCode', 'Failed to generate ZATCA QR Code', err);
      }
    }

    void generateCode();

    return () => {
      isMounted = false;
    };
  }, [sellerName, vatNumber, timestamp, totalAmount, vatAmount, size]);

  if (!qrDataUrl) {
    return (
      <div
        className={`flex items-center justify-center border border-dashed border-gray-300 bg-gray-50 text-[10px] text-gray-400 ${className}`}
        style={{ width: size, height: size }}
      >
        QR Code
      </div>
    );
  }

  return (
    <div className={`inline-block ${className}`}>
      <img
        src={qrDataUrl}
        alt="ZATCA E-Invoice QR Code"
        width={size}
        height={size}
        className="rounded-xs shadow-2xs block"
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    </div>
  );
};
