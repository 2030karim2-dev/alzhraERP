import { logger } from '../../core/utils/logger';

import React, { useEffect, useRef } from 'react';
import { X, Zap, Maximize, Scan } from 'lucide-react';

interface Props {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

const ScannerOverlay: React.FC<Props> = ({ onScan: _onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let animationFrameId: number;
    const videoEl = videoRef.current;

    const startCamera = () => {
      void (async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'environment',
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          });
          if (videoEl) {
            videoEl.srcObject = stream;

            // Initialize BarcodeDetector if available
            if ('BarcodeDetector' in window) {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
              const det = new (window as any).BarcodeDetector({
                formats: ['code_128', 'ean_13', 'qr_code', 'code_39'],
              });
              startDetection(det);
            } else {
              logger.warn('ScannerOverlay', 'BarcodeDetector not supported in this browser');
            }
          }
        } catch (err) {
          logger.error('ScannerOverlay', 'Camera access denied', err);
          alert('فشل الوصول للكاميرا. يرجى منح الصلاحية من إعدادات المتصفح.');
          onClose();
        }
      })();
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const startDetection = (det: any) => {
      const detect = () => {
        if (videoEl && videoEl.readyState === videoEl.HAVE_ENOUGH_DATA) {
          void (async () => {
            try {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
              const barcodes: Array<{ rawValue: string }> = await det.detect(videoEl);
              if (barcodes.length > 0) {
                const code = barcodes[0].rawValue;
                if ('vibrate' in navigator) navigator.vibrate(200);
                _onScan(code);
                return;
              }
            } catch (e) {
              logger.error('ScannerOverlay', 'Detection error:', e);
            }
            animationFrameId = requestAnimationFrame(detect);
          })();
        } else {
          animationFrameId = requestAnimationFrame(detect);
        }
      };
      animationFrameId = requestAnimationFrame(detect);
    };

    startCamera();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (videoEl) {
        const stream = videoEl.srcObject as MediaStream | null;
        stream?.getTracks().forEach(track => {
          track.stop();
        });
      }
    };
  }, [onClose, _onScan]);

  return (
    <div className="animate-in fade-in font-cairo fixed inset-0 z-[100] flex flex-col bg-black duration-500">
      <div className="relative z-10 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-6 text-white">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-blue-600 p-2">
            <Scan size={20} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest">
            Vision Scanner Pro
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded-full bg-white/10 p-2 transition-colors hover:bg-white/20"
        >
          <X size={24} />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="absolute inset-0 h-full w-full object-cover opacity-60 grayscale"
        />

        <div className="relative h-48 w-64 rounded-[2rem] border-2 border-blue-500 shadow-[0_0_0_1000px_rgba(0,0,0,0.6)]">
          <div className="absolute inset-0 animate-pulse bg-blue-500/10"></div>
          <div className="animate-scan-line absolute left-4 right-4 h-0.5 bg-blue-500 shadow-[0_0_15px_#3b82f6]"></div>

          <div className="absolute -left-1 -top-1 h-8 w-8 rounded-tl-2xl border-l-4 border-t-4 border-blue-500"></div>
          <div className="absolute -right-1 -top-1 h-8 w-8 rounded-tr-2xl border-r-4 border-t-4 border-blue-500"></div>
          <div className="absolute -bottom-1 -left-1 h-8 w-8 rounded-bl-2xl border-b-4 border-l-4 border-blue-500"></div>
          <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-br-2xl border-b-4 border-r-4 border-blue-500"></div>
        </div>

        <div className="absolute bottom-1/4 w-full space-y-2 px-10 text-center">
          <p className="text-sm font-bold text-white">بانتظار التعرف على الكود...</p>
          <p className="text-[10px] font-bold text-white/60">
            ضع باركود القطعة داخل الإطار للمسح التلقائي
          </p>
        </div>
      </div>

      <div className="relative z-10 flex justify-center gap-6 bg-gradient-to-t from-black/80 to-transparent p-10">
        <button className="rounded-3xl border border-white/10 bg-white/10 p-5 text-white transition-all active:scale-95">
          <Zap size={24} />
        </button>
        <button className="rounded-3xl border border-white/10 bg-white/10 p-5 text-white transition-all active:scale-95">
          <Maximize size={24} />
        </button>
      </div>

      <style>{`
        @keyframes scan-line {
          0% { top: 15%; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 85%; opacity: 0; }
        }
        .animate-scan-line {
          animation: scan-line 2.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default ScannerOverlay;
