import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exportToPDF } from './pdfExporter';

const mocks = vi.hoisted(() => ({
  capture: vi.fn(),
  pages: [] as Array<{ width: number; height: number; imageHeight: number; fileName: string }>,
}));

vi.mock('html2canvas', () => ({ default: mocks.capture }));
vi.mock('jspdf', async importOriginal => {
  const { jsPDF: ActualPDF } = await importOriginal<typeof import('jspdf')>();
  return {
    jsPDF: vi.fn().mockImplementation((...args: ConstructorParameters<typeof ActualPDF>) => {
      const pdf = new ActualPDF(...args);
      let imageHeight = 0;
      pdf.addImage = vi
        .fn()
        .mockImplementation(
          (
            _data: string,
            _format: string,
            _x: number,
            _y: number,
            _width: number,
            height: number
          ) => {
            imageHeight = height;
            return pdf;
          }
        );
      pdf.save = vi.fn().mockImplementation((fileName: string) => {
        mocks.pages.push({
          width: pdf.internal.pageSize.getWidth(),
          height: pdf.internal.pageSize.getHeight(),
          imageHeight,
          fileName,
        });
        return pdf;
      });
      return pdf;
    }),
  };
});

describe('exportToPDF page dimensions', () => {
  beforeEach(() => {
    mocks.pages.length = 0;
    mocks.capture.mockReset();
  });

  it.each([280, 300, 400, 800])(
    'contains all content with a scaled height of %s mm',
    async height => {
      mocks.capture.mockResolvedValue({
        width: 2100,
        height: height * 10,
        toDataURL: () => 'data:image/png;base64,test',
      });

      await exportToPDF(document.createElement('div'), 'invoice');

      expect(mocks.pages).toHaveLength(1);
      const page = mocks.pages[0]!;
      expect(page.width).toBeCloseTo(210, 1);
      expect(page.height).toBeGreaterThanOrEqual(page.imageHeight);
      expect(page.fileName).toBe('invoice.pdf');
      if (height === 280) expect(page.height).toBeCloseTo(297, 1);
    }
  );
});
