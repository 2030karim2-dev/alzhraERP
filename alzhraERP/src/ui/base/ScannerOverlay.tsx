
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
              height: { ideal: 720 }
            } 
          });
          if (videoEl) {
            videoEl.srcObject = stream;
            
            // Initialize BarcodeDetector if available
            if ('BarcodeDetector' in window) {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
              const det = new (window as any).BarcodeDetector({ formats: ['code_128', 'ean_13', 'qr_code', 'code_39'] });
              startDetection(det);
            } else {
              console.warn("BarcodeDetector not supported in this browser");
            }
          }
        } catch (err) {
          console.error("Camera access denied", err);
          alert("فشل الوصول للكاميرا. يرجى منح الصلاحية من إعدادات المتصفح.");
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
              console.error("Detection error:", e);
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
        stream?.getTracks().forEach(track => track.stop());
      }
    };
  }, [onClose, _onScan]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-500 font-cairo">
      <div className="p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent text-white relative z-10">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-600 rounded-xl"><Scan size={20} /></div>
          <span className="text-[10px] font-bold uppercase tracking-widest">Vision Scanner Pro</span>
        </div>
        <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"><X size={24} /></button>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover grayscale opacity-60" />

        <div className="relative w-64 h-48 border-2 border-blue-500 rounded-[2rem] shadow-[0_0_0_1000px_rgba(0,0,0,0.6)]">
          <div className="absolute inset-0 animate-pulse bg-blue-500/10"></div>
          <div className="absolute left-4 right-4 h-0.5 bg-blue-500 shadow-[0_0_15px_#3b82f6] animate-scan-line"></div>

          <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-2xl"></div>
          <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-2xl"></div>
          <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-2xl"></div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-2xl"></div>
        </div>

        <div className="absolute bottom-1/4 text-center w-full px-10 space-y-2">
            <p className="text-white font-bold text-sm">بانتظار التعرف على الكود...</p>
            <p className="text-white/60 text-[10px] font-bold">ضع باركود القطعة داخل الإطار للمسح التلقائي</p>
        </div>
      </div>

      <div className="p-10 flex justify-center gap-6 bg-gradient-to-t from-black/80 to-transparent relative z-10">
        <button className="p-5 bg-white/10 rounded-3xl text-white active:scale-95 transition-all border border-white/10"><Zap size={24} /></button>
        <button className="p-5 bg-white/10 rounded-3xl text-white active:scale-95 transition-all border border-white/10"><Maximize size={24} /></button>
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
