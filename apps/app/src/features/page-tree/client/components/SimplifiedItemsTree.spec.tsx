import type React from 'react';
import type { FC } from 'react';
import { Suspense } from 'react';
import { render, waitFor } from '@testing-library/react';

import type { IPageForTreeItem } from '~/interfaces/page';

import { clearChildrenCache } from '../hooks/use-data-loader';
import type { TreeItemProps } from '../interfaces';
import { SimplifiedItemsTree } from './SimplifiedItemsTree';

// Mock the apiv3Get function
const mockApiv3Get = vi.fn();
vi.mock('~/client/util/apiv3-client', () => ({
  apiv3Get: (...args: unknown[]) => mockApiv3Get(...args),
}));

// Mock useSWRxRootPage
const mockRootPage: IPageForTreeItem = {
  _id: 'root-page-id',
  path: '/',
  parent: null,
  descendantCount: 10,
  grant: 1,
  isEmpty: false,
  wip: false,
};

vi.mock('~/stores/page-listing', () => ({
  useSWRxRootPage: () => ({
    data: { rootPage: mockRootPage },
  }),
}));

// Mock page-tree-create state hooks
vi.mock('../states/page-tree-create', async () => {
  const actual = await vi.importActual('../states/page-tree-create');
  return {
    ...actual,
    useCreatingParentId: () => null,
    useCreatingParentPath: () => null,
  };
});

// Mock page-tree-update hooks
vi.mock('../states/page-tree-update', () => ({
  usePageTreeInformationGeneration: () => 1,
  usePageTreeRevalidationEffect: () => {},
}));

// Mock usePageRename
vi.mock('../hooks/use-page-rename', () => ({
  usePageRename: () => ({
    rename: vi.fn(),
    getPageName: (item: { getItemData: () => IPageForTreeItem }) => {
      const data = item.getItemData();
      const parts = data.path?.split('/') ?? [];
      return parts[parts.length - 1] || '/';
    },
  }),
}));

// Mock usePageCreate
vi.mock('../hooks/use-page-create', () => ({
  usePageCreate: () => ({
    createFromPlaceholder: vi.fn(),
    isCreatingPlaceholder: () => false,
    cancelCreating: vi.fn(),
  }),
}));

// Mock useScrollToSelectedItem
vi.mock('../hooks/use-scroll-to-selected-item', () => ({
  useScrollToSelectedItem: () => {},
}));

/**
 * Create mock page data for testing
 */
const createMockPage = (
  id: string,
  path: string,
  options: Partial<IPageForTreeItem> = {},
): IPageForTreeItem => ({
  _id: id,
  path,
  parent: null,
  descendantCount: 0,
  grant: 1,
  isEmpty: false,
  wip: false,
  ...options,
});

/**
 * Simple TreeItem component for testing
 */
const TestTreeItem: FC<TreeItemProps> = ({ item }) => {
  const itemData = item.getItemData();
  return <div data-testid={`tree-item-${itemData._id}`}>{itemData.path}</div>;
};

/**
 * Wrapper component with Suspense for testing
 */
const TestWrapper: FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
);

describe('SimplifiedItemsTree', () => {
  beforeEach(() => {
    // Clear cache before each test
    clearChildrenCache();
    // Reset mock
    mockApiv3Get.mockReset();
  });

  describe('API call optimization', () => {
    test('should only fetch children for expanded nodes, not for all visible nodes', async () => {
      // Setup: Root page has 3 children, each with descendantCount > 0 (folders)
      // but none are expanded initially except root
      const rootChildren = [
        createMockPage('child-1', '/Page1', { descendantCount: 5 }),
        createMockPage('child-2', '/Page2', { descendantCount: 3 }),
        createMockPage('child-3', '/Page3', { descendantCount: 0 }), // leaf node
      ];

      // Mock API responses
      mockApiv3Get.mockImplementation(
        (endpoint: string, params: { id: string }) => {
          if (endpoint === '/page-listing/children') {
            if (params.id === 'root-page-id') {
              return Promise.resolve({ data: { children: rootChildren } });
            }
            // Return empty children for other nodes (they shouldn't be called if not expanded)
            return Promise.resolve({ data: { children: [] } });
          }
          return Promise.reject(new Error(`Unexpected endpoint: ${endpoint}`));
        },
      );

      const scrollerElem = document.createElement('div');
      scrollerElem.style.height = '500px';
      scrollerElem.style.overflow = 'auto';
      document.body.appendChild(scrollerElem);

      render(
        <TestWrapper>
          <SimplifiedItemsTree
            targetPath="/"
            isEnableActions={false}
            CustomTreeItem={TestTreeItem}
            estimateTreeItemSize={() => 32}
            scrollerElem={scrollerElem}
          />
        </TestWrapper>,
      );

      // Wait for initial render and API calls to complete
      await waitFor(() => {
        expect(mockApiv3Get).toHaveBeenCalled();
      });

      // Give time for any additional API calls that might happen
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Key assertion: API should only be called for:
      // 1. root-page-id (the only expanded node by default)
      // NOT for child-1, child-2, child-3 even though they are visible
      const childrenApiCalls = mockApiv3Get.mock.calls.filter(
        (call) => call[0] === '/page-listing/children',
      );

      // Should only have 1 call for root-page-id
      expect(childrenApiCalls).toHaveLength(1);
      expect(childrenApiCalls[0][1]).toEqual({ id: 'root-page-id' });

      // Cleanup
      document.body.removeChild(scrollerElem);
    });

    test('should not call API for nodes that have descendantCount of 0 (leaf nodes)', async () => {
      // Setup: All children are leaf nodes (descendantCount = 0)
      const rootChildren = [
        createMockPage('leaf-1', '/Leaf1', { descendantCount: 0 }),
        createMockPage('leaf-2', '/Leaf2', { descendantCount: 0 }),
        createMockPage('leaf-3', '/Leaf3', { descendantCount: 0 }),
      ];

      mockApiv3Get.mockImplementation(
        (endpoint: string, params: { id: string }) => {
          if (
            endpoint === '/page-listing/children' &&
            params.id === 'root-page-id'
          ) {
            return Promise.resolve({ data: { children: rootChildren } });
          }
          return Promise.resolve({ data: { children: [] } });
        },
      );

      const scrollerElem = document.createElement('div');
      scrollerElem.style.height = '500px';
      document.body.appendChild(scrollerElem);

      render(
        <TestWrapper>
          <SimplifiedItemsTree
            targetPath="/"
            CustomTreeItem={TestTreeItem}
            estimateTreeItemSize={() => 32}
            scrollerElem={scrollerElem}
          />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(mockApiv3Get).toHaveBeenCalled();
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const childrenApiCalls = mockApiv3Get.mock.calls.filter(
        (call) => call[0] === '/page-listing/children',
      );

      // Only root should have children fetched
      expect(childrenApiCalls).toHaveLength(1);
      expect(childrenApiCalls[0][1]).toEqual({ id: 'root-page-id' });

      document.body.removeChild(scrollerElem);
    });

    test('isItemFolder should use descendantCount instead of calling getChildren()', async () => {
      // This test verifies the fix for the bug where isItemFolder called getChildren()
      // which triggered API calls for ALL visible nodes

      const rootChildren = [
        createMockPage('folder-1', '/Folder1', { descendantCount: 5 }),
        createMockPage('folder-2', '/Folder2', { descendantCount: 10 }),
        createMockPage('leaf-1', '/Leaf1', { descendantCount: 0 }),
      ];

      // Track which IDs have their children fetched
      const fetchedChildrenIds: string[] = [];

      mockApiv3Get.mockImplementation(
        (endpoint: string, params: { id: string }) => {
          if (endpoint === '/page-listing/children') {
            fetchedChildrenIds.push(params.id);
            if (params.id === 'root-page-id') {
              return Promise.resolve({ data: { children: rootChildren } });
            }
            return Promise.resolve({ data: { children: [] } });
          }
          return Promise.reject(new Error(`Unexpected endpoint: ${endpoint}`));
        },
      );

      const scrollerElem = document.createElement('div');
      scrollerElem.style.height = '500px';
      document.body.appendChild(scrollerElem);

      render(
        <TestWrapper>
          <SimplifiedItemsTree
            targetPath="/"
            CustomTreeItem={TestTreeItem}
            estimateTreeItemSize={() => 32}
            scrollerElem={scrollerElem}
          />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(mockApiv3Get).toHaveBeenCalled();
      });

      // Wait for any potential additional API calls
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Critical assertion: Only root-page-id should have children fetched
      // folder-1 and folder-2 should NOT be fetched even though they are folders (descendantCount > 0)
      // This verifies that isItemFolder doesn't call getChildren()
      expect(fetchedChildrenIds).toEqual(['root-page-id']);
      expect(fetchedChildrenIds).not.toContain('folder-1');
      expect(fetchedChildrenIds).not.toContain('folder-2');

      document.body.removeChild(scrollerElem);
    });
  });

  describe('auto-expand ancestors', () => {
    test('should fetch children only for ancestors of targetPath', async () => {
      // Setup: Deep nested structure
      // / (root)
      //   /Sandbox (expanded because it's ancestor of target)
      //     /Sandbox/Test (target)
      //   /Other (NOT expanded)

      const rootChildren = [
        createMockPage('sandbox-id', '/Sandbox', { descendantCount: 5 }),
        createMockPage('other-id', '/Other', { descendantCount: 3 }),
      ];

      const sandboxChildren = [
        createMockPage('test-id', '/Sandbox/Test', { descendantCount: 0 }),
      ];

      const fetchedChildrenIds: string[] = [];

      mockApiv3Get.mockImplementation(
        (endpoint: string, params: { id: string }) => {
          if (endpoint === '/page-listing/children') {
            fetchedChildrenIds.push(params.id);
            if (params.id === 'root-page-id') {
              return Promise.resolve({ data: { children: rootChildren } });
            }
            if (params.id === 'sandbox-id') {
              return Promise.resolve({ data: { children: sandboxChildren } });
            }
            return Promise.resolve({ data: { children: [] } });
          }
          return Promise.reject(new Error(`Unexpected endpoint: ${endpoint}`));
        },
      );

      const scrollerElem = document.createElement('div');
      scrollerElem.style.height = '500px';
      document.body.appendChild(scrollerElem);

      render(
        <TestWrapper>
          <SimplifiedItemsTree
            targetPath="/Sandbox/Test"
            CustomTreeItem={TestTreeItem}
            estimateTreeItemSize={() => 32}
            scrollerElem={scrollerElem}
          />
        </TestWrapper>,
      );

      // Wait for auto-expand to complete
      await waitFor(
        () => {
          expect(fetchedChildrenIds).toContain('sandbox-id');
        },
        { timeout: 1000 },
      );

      // Give some extra time for any unwanted calls
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should fetch: root-page-id (initial), sandbox-id (ancestor of target)
      // Should NOT fetch: other-id (not an ancestor of target)
      expect(fetchedChildrenIds).toContain('root-page-id');
      expect(fetchedChildrenIds).toContain('sandbox-id');
      expect(fetchedChildrenIds).not.toContain('other-id');

      document.body.removeChild(scrollerElem);
    });
  });
});
