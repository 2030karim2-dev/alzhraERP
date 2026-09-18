import React, { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PdfCaptureHost } from './PdfCaptureHost';

describe('PdfCaptureHost — مضيف التصدير خارج الشاشة', () => {
  it('ينقل المضيف إلى body خارج حاوية المكوّن الأصلي', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <div data-testid="modal-root">
        <PdfCaptureHost innerRef={ref}>
          <span>فاتورة ضريبية</span>
        </PdfCaptureHost>
      </div>
    );

    expect(container.querySelector('.pdf-capture-host')).toBeNull();
    expect(document.body.querySelector('.pdf-capture-host')).not.toBeNull();
  });

  it('يبقي عنصر الالتقاط مرئياً قابلاً للقياس (بلا display:none)', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PdfCaptureHost innerRef={ref}>
        <span>فاتورة ضريبية</span>
      </PdfCaptureHost>
    );

    const host = document.body.querySelector<HTMLElement>('.pdf-capture-host');
    expect(host).not.toBeNull();
    expect(host?.style.display).toBe('');
    expect(host?.getAttribute('aria-hidden')).toBe('true');
    expect(ref.current).not.toBeNull();
    expect(ref.current?.contains(screen.getByText('فاتورة ضريبية'))).toBe(true);
  });

  it('يعرض نفس المحتوى الذي يُصدَّر إلى PDF', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PdfCaptureHost innerRef={ref}>
        <p>إجمالي شامل الضريبة</p>
      </PdfCaptureHost>
    );

    expect(ref.current?.textContent).toContain('إجمالي شامل الضريبة');
  });
});
