/**
 * Tests for useColumnResize — سحب ناعم ومحفوظ لعرض الأعمدة.
 * يغطي: الاتجاه LTR/RTL، حدّ العرض الأدنى، الحفظ/الاستعادة، resetWidths،
 * دمج التحديثات بإطار رسم واحد (rAF batching) وتنظيف المستمعات.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useColumnResize } from './useColumnResize';

// ── محاكاة rAF يدوية للتحكم بأطر الرسم ──────────────────────────────
let rafQueue: FrameRequestCallback[] = [];
const stubRaf = (cb: FrameRequestCallback): number => {
  rafQueue.push(cb);
  return rafQueue.length;
};
const stubCancelRaf = (): void => {
  rafQueue = [];
};
const flushFrames = (): void => {
  const q = [...rafQueue];
  rafQueue = [];
  q.forEach(cb => {
    cb(performance.now());
  });
};

const makeTarget = (width = 200): { handle: HTMLElement; th: HTMLTableCellElement } => {
  const th = document.createElement('th');
  Object.defineProperty(th, 'offsetWidth', { value: width, configurable: true });
  const handle = document.createElement('div');
  th.appendChild(handle);
  return { handle, th };
};

const fireMouseMove = (pageX: number): void => {
  const ev = new MouseEvent('mousemove', { bubbles: true });
  Object.defineProperty(ev, 'pageX', { value: pageX });
  document.dispatchEvent(ev);
};

beforeEach(() => {
  rafQueue = [];
  window.requestAnimationFrame = stubRaf;
  window.cancelAnimationFrame = stubCancelRaf;
  localStorage.clear();
  document.dir = 'ltr';
});

// مساعد: بدء السحب عبر onResizeMouseDown بالخصائص المطلوبة
const startResize = (
  result: { current: { onResizeMouseDown: (e: React.MouseEvent, field: string) => void } },
  handle: HTMLElement,
  pageX: number,
  field = 'name'
): void => {
  act(() => {
    result.current.onResizeMouseDown(
      {
        target: handle,
        pageX,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.MouseEvent,
      field
    );
  });
};

// مساعد: تحريك مؤشر + تنفيذ إطار الرسم داخل act حتى تُفلَش التحديثات
const dragTo = (pageX: number): void => {
  act(() => {
    fireMouseMove(pageX);
    flushFrames();
  });
};

describe('useColumnResize', () => {
  it('ينشئ قيماً افتراضية عند عدم وجود محفوظات', () => {
    const { result } = renderHook(() =>
      useColumnResize({
        storageKey: 'test-cols',
        defaultWidths: { name: 300, qty: 80 },
      })
    );

    expect(result.current.colWidths).toEqual({ name: 300, qty: 80 });
    expect(result.current.isResizing).toBe(false);
  });

  it('يحفظ العروض في localStorage بعد التغيير ويعيد تحميلها', () => {
    const { result, unmount } = renderHook(() =>
      useColumnResize({
        storageKey: 'persist-cols',
        defaultWidths: { name: 200 },
        isRTL: false,
      })
    );

    const { handle } = makeTarget(200);
    startResize(result, handle, 100);
    dragTo(160); // +60 → 260

    expect(result.current.colWidths.name).toBe(260);
    const saved = JSON.parse(localStorage.getItem('persist-cols') ?? '{}');
    expect(saved.name).toBe(260);

    unmount();

    const { result: reloaded } = renderHook(() =>
      useColumnResize({
        storageKey: 'persist-cols',
        defaultWidths: { name: 200 },
        isRTL: false,
      })
    );
    expect(reloaded.current.colWidths.name).toBe(260);
  });

  it('لا يحفظ في localStorage عند غياب storageKey', () => {
    const { result } = renderHook(() =>
      useColumnResize({
        defaultWidths: { name: 200 },
        isRTL: false,
      })
    );

    const { handle } = makeTarget(200);
    startResize(result, handle, 100);
    dragTo(150);

    expect(result.current.colWidths.name).toBe(250);
    expect(localStorage.length).toBe(0);
  });

  it('LTR: السحب يميناً يكبّر العمود ويساراً يصغّره', () => {
    const { result } = renderHook(() =>
      useColumnResize({
        storageKey: 'ltr-cols',
        defaultWidths: { name: 200 },
        isRTL: false,
      })
    );

    const { handle } = makeTarget(200);
    startResize(result, handle, 100);
    dragTo(150); // يمين → يكبر
    expect(result.current.colWidths.name).toBe(250);

    dragTo(60); // يسار → يصغر
    expect(result.current.colWidths.name).toBe(160);
  });

  it('RTL: السحب يميناً يصغّر العمود ويساراً يكبّره', () => {
    const { result } = renderHook(() =>
      useColumnResize({
        storageKey: 'rtl-cols',
        defaultWidths: { name: 200 },
        isRTL: true,
      })
    );

    const { handle } = makeTarget(200);
    startResize(result, handle, 100);
    dragTo(150); // يمين → يصغر
    expect(result.current.colWidths.name).toBe(150);

    dragTo(40); // يسار → يكبر
    expect(result.current.colWidths.name).toBe(260);
  });

  it('يقيس العرض الفعلي للخلية عند بدء السحب (يفضّله على القيمة المحفوظة)', () => {
    const { result } = renderHook(() =>
      useColumnResize({
        storageKey: 'measure-cols',
        defaultWidths: { name: 500 },
        isRTL: false,
      })
    );

    // العرض الفعلي 120 رغم الافتراضي 500
    const { handle } = makeTarget(120);
    startResize(result, handle, 100);
    dragTo(130);
    expect(result.current.colWidths.name).toBe(150);
  });

  it('يقيّد العرض بالحد الأدنى minWidth', () => {
    const { result } = renderHook(() =>
      useColumnResize({
        storageKey: 'min-cols',
        defaultWidths: { name: 200 },
        minWidth: 60,
        isRTL: false,
      })
    );

    const { handle } = makeTarget(200);
    startResize(result, handle, 100);
    dragTo(10); // delta -90 → 110 (لا يصل للحد)
    expect(result.current.colWidths.name).toBe(110);

    dragTo(-1000); // سحب بعيد جداً
    expect(result.current.colWidths.name).toBe(60);
  });

  it('يدمج تحديثات السحب بإطار رسم واحد فقط (rAF batching)', () => {
    const { result } = renderHook(() =>
      useColumnResize({
        storageKey: 'batch-cols',
        defaultWidths: { name: 200 },
        isRTL: false,
      })
    );

    const { handle } = makeTarget(200);
    startResize(result, handle, 100);

    act(() => {
      fireMouseMove(120);
      fireMouseMove(150);
      fireMouseMove(180);
    });

    // لم يُفلَش أي إطار بعد → لا تحديث بعد
    expect(result.current.colWidths.name).toBe(200);
    // إطار واحد مجدول رغم 3 حركات
    expect(rafQueue.length).toBe(1);

    act(() => {
      flushFrames();
    });
    expect(result.current.colWidths.name).toBe(280); // يعكس آخر حركة فقط
  });

  it('resetWidths يعيد العروض إلى الافتراضية', () => {
    const { result } = renderHook(() =>
      useColumnResize({
        storageKey: 'reset-cols',
        defaultWidths: { name: 200, qty: 80 },
        isRTL: false,
      })
    );

    const { handle } = makeTarget(200);
    startResize(result, handle, 100);
    dragTo(300);
    expect(result.current.colWidths.name).toBe(400);

    act(() => {
      result.current.resetWidths();
    });
    expect(result.current.colWidths).toEqual({ name: 200, qty: 80 });
  });

  it('ينظف مستمعات document ويلغي الإطار المعلّق ويعيد أنماط الجسم عند unmount', () => {
    const { result, unmount } = renderHook(() =>
      useColumnResize({
        storageKey: 'cleanup-cols',
        defaultWidths: { name: 200 },
        isRTL: false,
      })
    );

    const { handle } = makeTarget(200);
    startResize(result, handle, 100);
    act(() => {
      fireMouseMove(150);
    }); // جدولة إطار
    expect(rafQueue.length).toBe(1);

    unmount();

    // لا تحديث بعد إلغاء الإطار
    act(() => {
      flushFrames();
    });
    expect(result.current.colWidths.name).toBe(200);
    // السحب لا يحدث شيئاً بعد التنظيف
    act(() => {
      fireMouseMove(250);
      flushFrames();
    });
    expect(result.current.colWidths.name).toBe(200);
    expect(document.body.style.userSelect).toBe('');
    expect(document.body.style.cursor).toBe('');
  });
});
