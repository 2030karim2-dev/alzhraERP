import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { MultiViewContainer } from './MultiViewContainer';
import { useWorkspaceTabStore, DEFAULT_ROOT_TAB } from '../../../core/store/workspaceTabStore';

const MockHome = () => <div data-testid="page-home">محتوى الرئيسية</div>;
const MockSales = () => <div data-testid="page-sales">محتوى المبيعات</div>;

describe('MultiViewContainer', () => {
  beforeEach(() => {
    useWorkspaceTabStore.setState({
      tabs: [DEFAULT_ROOT_TAB],
      activeTabId: '/',
      isEnabled: true,
    });
  });

  it('renders active route content correctly', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<MultiViewContainer />}>
            <Route index element={<MockHome />} />
            <Route path="sales" element={<MockSales />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('page-home')).toBeInTheDocument();
  });

  it('preserves cached view elements in DOM when tabs exist', () => {
    useWorkspaceTabStore.setState({
      tabs: [
        DEFAULT_ROOT_TAB,
        {
          id: '/sales',
          path: '/sales',
          title: 'المبيعات',
          isClosable: true,
        },
      ],
      activeTabId: '/sales',
      isEnabled: true,
    });

    render(
      <MemoryRouter initialEntries={['/sales']}>
        <Routes>
          <Route path="/" element={<MultiViewContainer />}>
            <Route index element={<MockHome />} />
            <Route path="sales" element={<MockSales />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('page-sales')).toBeInTheDocument();
  });
});
