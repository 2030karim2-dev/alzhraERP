import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computePageSlices, exportToPDF } from './pdfExporter';

interface CapturedImage {
  pageIndex: number;
  offsetY: number;
  imageWidth: number;
  imageHeight: number;
}

interface CapturedFile {
  fileName: string;
  pageWidth: number;
  pageHeight: number;
  images: CapturedImage[];
}

const mocks = vi.hoisted(() => ({ capture: vi.fn(), files: [] as CapturedFile[] }));

vi.mock('html2canvas', () => ({ default: mocks.capture }));

vi.mock('jspdf', async importOriginal => {
  const { jsPDF: ActualPDF } = await importOriginal<typeof import('jspdf')>();
  return {
    jsPDF: vi.fn().mockImplementation((...args: ConstructorParameters<typeof ActualPDF>) => {
      const pdf = new ActualPDF(...args);
      const images: CapturedImage[] = [];
      let pageIndex = 0;
      pdf.addPage = vi.fn().mockImplementation(() => {
        pageIndex += 1;
        return pdf;
      }) as unknown as typeof pdf.addPage;
      pdf.addImage = vi
        .fn()
        .mockImplementation(
          (
            _data: string,
            _format: string,
            _x: number,
            y: number,
            width: number,
            height: number
          ) => {
            images.push({ pageIndex, offsetY: y, imageWidth: width, imageHeight: height });
            return pdf;
          }
        ) as unknown as typeof pdf.addImage;
      pdf.save = vi.fn().mockImplementation((fileName: string) => {
        mocks.files.push({
          fileName,
          pageWidth: pdf.internal.pageSize.getWidth(),
          pageHeight: pdf.internal.pageSize.getHeight(),
          images: [...images],
        });
        return pdf;
      }) as unknown as typeof pdf.save;
      return pdf;
    }),
  };
});

const captureOfHeightMm = (heightMm: number) => ({
  width: 2100,
  height: heightMm * 10,
  toDataURL: () => 'data:image/png;base64,test',
});

describe('computePageSlices', () => {
  it('keeps short content on a single slice', () => {
    expect(computePageSlices(100, 297)).toEqual([{ sourceY: 0, sourceHeight: 100 }]);
  });

  it('returns no slices for empty content', () => {
    expect(computePageSlices(0, 297)).toEqual([]);
  });

  it('splits exact multiples into full pages', () => {
    expect(computePageSlices(594, 297)).toEqual([
      { sourceY: 0, sourceHeight: 297 },
      { sourceY: 297, sourceHeight: 297 },
    ]);
  });

  it('covers tall content exactly once across pages', () => {
    const slices = computePageSlices(800, 297);
    expect(slices).toHaveLength(3);
    expect(slices.reduce((sum, slice) => sum + slice.sourceHeight, 0)).toBeCloseTo(800, 6);
    slices.forEach((slice, index) => {
      expect(slice.sourceHeight).toBeLessThanOrEqual(297.000001);
      if (index > 0) {
        const previous = slices[index - 1]!;
        expect(slice.sourceY).toBeCloseTo(previous.sourceY + previous.sourceHeight, 6);
      }
    });
  });

  it('prefers the last boundary that still fits on the page', () => {
    expect(computePageSlices(800, 297, [250, 500, 620, 700])).toEqual([
      { sourceY: 0, sourceHeight: 250 },
      { sourceY: 250, sourceHeight: 250 },
      { sourceY: 500, sourceHeight: 200 },
      { sourceY: 700, sourceHeight: 100 },
    ]);
  });

  it('ignores boundaries outside the page or beyond the document', () => {
    expect(computePageSlices(400, 297, [0, -10, 297, 1200, Number.NaN])).toEqual([
      { sourceY: 0, sourceHeight: 297 },
      { sourceY: 297, sourceHeight: 103 },
    ]);
  });
});

describe('exportToPDF pagination', () => {
  beforeEach(() => {
    mocks.files.length = 0;
    mocks.capture.mockReset();
  });

  it('keeps content that fits inside one standard A4 page', async () => {
    mocks.capture.mockResolvedValue(captureOfHeightMm(280));

    await exportToPDF(document.createElement('div'), 'invoice');

    expect(mocks.files).toHaveLength(1);
    const file = mocks.files[0]!;
    expect(file.fileName).toBe('invoice.pdf');
    expect(file.pageWidth).toBeCloseTo(210, 1);
    expect(file.pageHeight).toBeCloseTo(297, 1);
    expect(file.images).toHaveLength(1);
    const image = file.images[0]!;
    expect(image.pageIndex).toBe(0);
    expect(image.offsetY).toBe(0);
    expect(image.imageWidth).toBeCloseTo(210, 1);
    expect(image.imageHeight).toBeLessThanOrEqual(file.pageHeight);
  });

  it('fails loudly instead of saving a blank PDF for an empty capture', async () => {
    mocks.capture.mockResolvedValue(captureOfHeightMm(0));

    await expect(exportToPDF(document.createElement('div'), 'invoice')).rejects.toThrow(/empty/i);
    expect(mocks.files).toHaveLength(0);
  });

  it.each([300, 400, 800])(
    'paginates %s mm of content across standard pages without losing content',
    async heightMm => {
      mocks.capture.mockResolvedValue(captureOfHeightMm(heightMm));

      await exportToPDF(document.createElement('div'), 'invoice');

      expect(mocks.files).toHaveLength(1);
      const file = mocks.files[0]!;
      const pageIndexes = [...new Set(file.images.map(image => image.pageIndex))];
      expect(pageIndexes).toHaveLength(Math.ceil(heightMm / 297 - 1e-6));
      expect(pageIndexes).toEqual(pageIndexes.map((_, index) => index));
      expect(file.pageWidth).toBeCloseTo(210, 1);
      expect(file.pageHeight).toBeCloseTo(297, 1);

      // Every page draws the full document shifted up, so each page shows its own window.
      file.images.forEach(image => {
        expect(image.imageWidth).toBeCloseTo(210, 1);
        expect(image.imageHeight).toBeCloseTo(heightMm, 1);
      });
      const offsets = [...new Set(file.images.map(image => image.offsetY))];
      expect(offsets).toHaveLength(pageIndexes.length);
      expect(offsets[0]).toBe(0);
      offsets.slice(1).forEach(offset => expect(offset).toBeLessThan(0));
      // Consecutive windows are contiguous: no row falls between two pages.
      offsets.forEach((offset, index) => {
        if (index === 0) return;
        expect(offsets[index - 1]! - offset).toBeCloseTo(297, 1);
      });
    }
  );
});
