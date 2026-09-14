import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { WorkspaceTabBar } from './WorkspaceTabBar';
import { useWorkspaceTabStore, DEFAULT_ROOT_TAB } from '../../../core/store/workspaceTabStore';

describe('WorkspaceTabBar Component', () => {
  beforeEach(() => {
    useWorkspaceTabStore.setState({
      tabs: [
        DEFAULT_ROOT_TAB,
        {
          id: '/sales',
          path: '/sales',
          title: 'المبيعات والفواتير',
          iconKey: 'ShoppingBag',
          isClosable: true,
          isDirty: false,
        },
      ],
      activeTabId: '/sales',
      isEnabled: true,
    });
  });

  it('renders open tabs correctly', () => {
    render(
      <MemoryRouter initialEntries={['/sales']}>
        <WorkspaceTabBar />
      </MemoryRouter>
    );

    expect(screen.getByText('الرئيسية')).toBeInTheDocument();
    expect(screen.getByText('المبيعات والفواتير')).toBeInTheDocument();
  });

  it('shows close button for closable tabs and removes tab on click', () => {
    render(
      <MemoryRouter initialEntries={['/sales']}>
        <WorkspaceTabBar />
      </MemoryRouter>
    );

    const closeBtn = screen.getByLabelText('إغلاق تبويب المبيعات والفواتير');
    expect(closeBtn).toBeInTheDocument();

    fireEvent.click(closeBtn);

    const state = useWorkspaceTabStore.getState();
    expect(state.tabs.find(t => t.id === '/sales')).toBeUndefined();
  });

  it('renders dirty indicator when a tab has unsaved changes', () => {
    useWorkspaceTabStore.setState({
      tabs: [
        DEFAULT_ROOT_TAB,
        {
          id: '/sales',
          path: '/sales',
          title: 'المبيعات والفواتير',
          iconKey: 'ShoppingBag',
          isClosable: true,
          isDirty: true,
        },
      ],
      activeTabId: '/sales',
      isEnabled: true,
    });

    render(
      <MemoryRouter initialEntries={['/sales']}>
        <WorkspaceTabBar />
      </MemoryRouter>
    );

    const dirtyDot = screen.getByTitle('توجد تعديلات غير محفوظة');
    expect(dirtyDot).toBeInTheDocument();
  });
});
