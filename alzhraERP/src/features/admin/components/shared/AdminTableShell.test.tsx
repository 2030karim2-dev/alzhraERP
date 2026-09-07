import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AdminTableShell } from './AdminTableShell';
import type { AdminPaginationProps } from './AdminPagination';

const buildPagination = (overrides: Partial<AdminPaginationProps> = {}): AdminPaginationProps => ({
  page: 1,
  totalPages: 3,
  itemCount: 10,
  totalItems: 30,
  itemLabel: 'منشأة',
  isLoading: false,
  onPrev: () => {},
  onNext: () => {},
  ...overrides,
});

const columns = [{ label: 'الاسم' }, { label: 'الحالة' }];

const sampleRow = (
  <tr>
    <td>منشأة الأمل</td>
    <td>نشطة</td>
  </tr>
);

describe('AdminTableShell — غلاف الجدول الموحّد', () => {
  it('يعرض عناوين الأعمدة والصفوف عند توفر البيانات', () => {
    render(
      <AdminTableShell
        columns={columns}
        hasRows
        pagination={buildPagination()}
        emptyMessage="لا توجد بيانات"
      >
        {sampleRow}
      </AdminTableShell>
    );
    expect(screen.getByText('الاسم')).toBeTruthy();
    expect(screen.getByText('منشأة الأمل')).toBeTruthy();
    expect(screen.getByText('نشطة')).toBeTruthy();
  });

  it('يعرض رسالة التحميل ويخفي شريط الترقيم أثناء الجلب', () => {
    render(
      <AdminTableShell
        columns={columns}
        hasRows={false}
        loading
        pagination={buildPagination({ isLoading: true })}
        emptyMessage="لا توجد بيانات"
      >
        {sampleRow}
      </AdminTableShell>
    );
    expect(screen.getByText(/جاري تحميل البيانات/)).toBeTruthy();
    expect(screen.queryByText(/صفحة 1 من 3/)).toBeNull();
  });

  it('يعرض رسالة الخطأ عند error', () => {
    render(
      <AdminTableShell
        columns={columns}
        hasRows={false}
        error
        pagination={buildPagination()}
        emptyMessage="لا توجد بيانات"
      >
        {sampleRow}
      </AdminTableShell>
    );
    expect(screen.getByText(/تعذر تحميل البيانات/)).toBeTruthy();
  });

  it('يعرض رسالة الحالة الفارغة عند عدم وجود صفوف', () => {
    render(
      <AdminTableShell
        columns={columns}
        hasRows={false}
        pagination={buildPagination()}
        emptyMessage="لا توجد منشآت مطابقة لمعايير البحث."
      >
        {sampleRow}
      </AdminTableShell>
    );
    expect(screen.getByText('لا توجد منشآت مطابقة لمعايير البحث.')).toBeTruthy();
  });

  it('يعرض معلومات الصفحة في شريط الترقيم', () => {
    render(
      <AdminTableShell
        columns={columns}
        hasRows
        pagination={buildPagination({ page: 2, totalPages: 4, itemCount: 10, totalItems: 40 })}
        emptyMessage="لا توجد بيانات"
      >
        {sampleRow}
      </AdminTableShell>
    );
    expect(screen.getByText(/عرض 10 من 40 منشأة/)).toBeTruthy();
    expect(screen.getByText(/صفحة 2 من 4/)).toBeTruthy();
  });
});
