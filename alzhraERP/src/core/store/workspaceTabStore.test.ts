import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkspaceTabStore, DEFAULT_ROOT_TAB } from './workspaceTabStore';

describe('workspaceTabStore', () => {
  beforeEach(() => {
    useWorkspaceTabStore.setState({
      tabs: [DEFAULT_ROOT_TAB],
      activeTabId: '/',
      isEnabled: true,
    });
  });

  it('initializes with the default root tab', () => {
    const state = useWorkspaceTabStore.getState();
    expect(state.tabs.length).toBe(1);
    expect(state.tabs[0].id).toBe('/');
    expect(state.tabs[0].isClosable).toBe(false);
    expect(state.activeTabId).toBe('/');
  });

  it('opens a new tab and sets it as active', () => {
    const { openTab } = useWorkspaceTabStore.getState();
    openTab({
      id: '/sales',
      path: '/sales',
      title: 'المبيعات',
      iconKey: 'ShoppingBag',
    });

    const state = useWorkspaceTabStore.getState();
    expect(state.tabs.length).toBe(2);
    expect(state.tabs[1].id).toBe('/sales');
    expect(state.tabs[1].title).toBe('المبيعات');
    expect(state.activeTabId).toBe('/sales');
  });

  it('switches to existing tab if already opened and updates path', () => {
    const { openTab } = useWorkspaceTabStore.getState();
    openTab({ id: '/inventory', path: '/inventory', title: 'المخزون' });
    openTab({ id: '/sales', path: '/sales', title: 'المبيعات' });

    // Open inventory again with filter
    openTab({ id: '/inventory', path: '/inventory?filter=low', title: 'المخزون' });

    const state = useWorkspaceTabStore.getState();
    expect(state.tabs.length).toBe(3);
    expect(state.activeTabId).toBe('/inventory');
    const invTab = state.tabs.find(t => t.id === '/inventory');
    expect(invTab?.path).toBe('/inventory?filter=low');
  });

  it('does not allow closing the non-closable root tab', () => {
    const { closeTab } = useWorkspaceTabStore.getState();
    const result = closeTab('/');
    expect(result).toBeNull();
    expect(useWorkspaceTabStore.getState().tabs.length).toBe(1);
  });

  it('closes an active tab and returns the next active tab path', () => {
    const { openTab, closeTab } = useWorkspaceTabStore.getState();
    openTab({ id: '/sales', path: '/sales', title: 'المبيعات' });
    openTab({ id: '/bonds', path: '/bonds', title: 'السندات' });

    expect(useWorkspaceTabStore.getState().activeTabId).toBe('/bonds');

    const nextPath = closeTab('/bonds');
    expect(nextPath).toBe('/sales');

    const state = useWorkspaceTabStore.getState();
    expect(state.tabs.length).toBe(2);
    expect(state.activeTabId).toBe('/sales');
  });

  it('closes other tabs leaving only the target tab and root', () => {
    const { openTab, closeOtherTabs } = useWorkspaceTabStore.getState();
    openTab({ id: '/sales', path: '/sales', title: 'المبيعات' });
    openTab({ id: '/bonds', path: '/bonds', title: 'السندات' });
    openTab({ id: '/expenses', path: '/expenses', title: 'المصروفات' });

    closeOtherTabs('/bonds');

    const state = useWorkspaceTabStore.getState();
    expect(state.tabs.map(t => t.id)).toEqual(['/', '/bonds']);
    expect(state.activeTabId).toBe('/bonds');
  });

  it('closes all tabs and returns root path', () => {
    const { openTab, closeAllTabs } = useWorkspaceTabStore.getState();
    openTab({ id: '/sales', path: '/sales', title: 'المبيعات' });
    openTab({ id: '/bonds', path: '/bonds', title: 'السندات' });

    const rootPath = closeAllTabs();
    expect(rootPath).toBe('/');

    const state = useWorkspaceTabStore.getState();
    expect(state.tabs.length).toBe(1);
    expect(state.activeTabId).toBe('/');
  });

  it('toggles dirty state and tab titles', () => {
    const { openTab, setIsDirty, updateTabTitle } = useWorkspaceTabStore.getState();
    openTab({ id: '/sales', path: '/sales', title: 'المبيعات' });

    setIsDirty('/sales', true);
    expect(useWorkspaceTabStore.getState().tabs.find(t => t.id === '/sales')?.isDirty).toBe(true);

    updateTabTitle('/sales', 'فاتورة مبيعات #1042');
    expect(useWorkspaceTabStore.getState().tabs.find(t => t.id === '/sales')?.title).toBe(
      'فاتورة مبيعات #1042'
    );
  });
});
