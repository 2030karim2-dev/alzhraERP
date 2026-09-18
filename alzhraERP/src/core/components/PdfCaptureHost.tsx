import type { ReactElement, ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';

interface PdfCaptureHostProps {
  /** Ref attached to the capture root; pass the same ref to `exportToPDF`. */
  innerRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}

/**
 * Off-screen host for PDF export (`html2canvas`).
 *
 * Rules that keep exports working:
 * - The host must never be `display: none` or `visibility: hidden`, otherwise the
 *   capture has no measurable dimensions and the exported PDF comes out blank.
 * - It is portaled to `document.body` so that transformed / overflow-hidden modal
 *   ancestors can never clip it.
 * - It keeps a real A4 width, so print templates render at their natural size.
 * - CSS (`.pdf-capture-host`) hides it on screen and excludes it from physical printing.
 */
export const PdfCaptureHost = ({
  innerRef,
  children,
}: PdfCaptureHostProps): ReactElement | null => {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="pdf-capture-host" aria-hidden="true">
      <div ref={innerRef}>{children}</div>
    </div>,
    document.body
  );
};

export default PdfCaptureHost;
