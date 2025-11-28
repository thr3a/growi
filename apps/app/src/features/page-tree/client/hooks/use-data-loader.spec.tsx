import { renderHook } from '@testing-library/react';

import type { IPageForTreeItem } from '~/interfaces/page';

import { ROOT_PAGE_VIRTUAL_ID } from '../../constants';
import { CREATING_PAGE_VIRTUAL_ID } from '../states/page-tree-create';
import { clearChildrenCache, useDataLoader } from './use-data-loader';

/**
 * Type helper to extract getChildrenWithData from TreeDataLoader
 * TreeDataLoader is a union type, and we're using the variant with getChildrenWithData
 */
type DataLoaderWithChildrenData = ReturnType<typeof useDataLoader> & {
  getChildrenWithData: (itemId: string) => Promise<{ id: string; data: IPageForTreeItem }[]>;
};

// Mock the apiv3Get function
const mockApiv3Get = vi.fn();
vi.mock('~/client/util/apiv3-client', () => ({
  apiv3Get: (...args: unknown[]) => mockApiv3Get(...args),
}));

// Mutable state for creating parent info
let mockCreatingParentId: string | null = null;
let mockCreatingParentPath: string | null = null;

// Mock the page-tree-create state hooks
vi.mock('../states/page-tree-create', async () => {
  const actual = await vi.importActual('../states/page-tree-create');
  return {
    ...actual,
    useCreatingParentId: () => mockCreatingParentId,
    useCreatingParentPath: () => mockCreatingParentPath,
  };
});

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
 * Helper to get typed dataLoader with getChildrenWithData
 */
const getDataLoader = (
  result: { current: ReturnType<typeof useDataLoader> },
): DataLoaderWithChildrenData => {
  return result.current as DataLoaderWithChildrenData;
};

describe('use-data-loader', () => {
  const ROOT_PAGE_ID = 'root-page-id';
  const ALL_PAGES_COUNT = 100;

  beforeEach(() => {
    // Clear cache before each test
    clearChildrenCache();
    // Reset mock
    mockApiv3Get.mockReset();
    // Reset creating state
    mockCreatingParentId = null;
    mockCreatingParentPath = null;
  });

  describe('useDataLoader', () => {
    describe('getItem', () => {
      test('should return virtual root data without API call', async () => {
        const { result } = renderHook(() =>
          useDataLoader(ROOT_PAGE_ID, ALL_PAGES_COUNT),
        );

        const item = await result.current.getItem(ROOT_PAGE_VIRTUAL_ID);

        expect(item._id).toBe(ROOT_PAGE_ID);
        expect(item.path).toBe('/');
        expect(item.descendantCount).toBe(ALL_PAGES_COUNT);
        expect(mockApiv3Get).not.toHaveBeenCalled();
      });

      test('should return placeholder data without API call for creating placeholder', async () => {
        const { result } = renderHook(() =>
          useDataLoader(ROOT_PAGE_ID, ALL_PAGES_COUNT),
        );

        const item = await result.current.getItem(CREATING_PAGE_VIRTUAL_ID);

        expect(item._id).toBe(CREATING_PAGE_VIRTUAL_ID);
        expect(mockApiv3Get).not.toHaveBeenCalled();
      });

      test('should call API for regular item', async () => {
        const mockPage = createMockPage('page-1', '/test');
        mockApiv3Get.mockResolvedValue({ data: { item: mockPage } });

        const { result } = renderHook(() =>
          useDataLoader(ROOT_PAGE_ID, ALL_PAGES_COUNT),
        );

        const item = await result.current.getItem('page-1');

        expect(item).toEqual(mockPage);
        expect(mockApiv3Get).toHaveBeenCalledTimes(1);
        expect(mockApiv3Get).toHaveBeenCalledWith('/page-listing/item', {
          id: 'page-1',
        });
      });
    });

    describe('getChildrenWithData', () => {
      test('should return root page without API call for virtual root', async () => {
        const { result } = renderHook(() =>
          useDataLoader(ROOT_PAGE_ID, ALL_PAGES_COUNT),
        );

        const children =
          await getDataLoader(result).getChildrenWithData(ROOT_PAGE_VIRTUAL_ID);

        expect(children).toHaveLength(1);
        expect(children[0].id).toBe(ROOT_PAGE_ID);
        expect(children[0].data.path).toBe('/');
        expect(mockApiv3Get).not.toHaveBeenCalled();
      });

      test('should return empty array without API call for placeholder node', async () => {
        const { result } = renderHook(() =>
          useDataLoader(ROOT_PAGE_ID, ALL_PAGES_COUNT),
        );

        const children = await getDataLoader(result).getChildrenWithData(
          CREATING_PAGE_VIRTUAL_ID,
        );

        expect(children).toHaveLength(0);
        expect(mockApiv3Get).not.toHaveBeenCalled();
      });

      test('should call API for regular item', async () => {
        const mockChildren = [
          createMockPage('child-1', '/parent/child-1'),
          createMockPage('child-2', '/parent/child-2'),
        ];
        mockApiv3Get.mockResolvedValue({ data: { children: mockChildren } });

        const { result } = renderHook(() =>
          useDataLoader(ROOT_PAGE_ID, ALL_PAGES_COUNT),
        );

        const children = await getDataLoader(result).getChildrenWithData('parent-id');

        expect(children).toHaveLength(2);
        expect(children[0].id).toBe('child-1');
        expect(children[1].id).toBe('child-2');
        expect(mockApiv3Get).toHaveBeenCalledTimes(1);
        expect(mockApiv3Get).toHaveBeenCalledWith('/page-listing/children', {
          id: 'parent-id',
        });
      });
    });

    describe('cache behavior - API call count', () => {
      test('should call API only once for same itemId (cache hit)', async () => {
        const mockChildren = [createMockPage('child-1', '/parent/child-1')];
        mockApiv3Get.mockResolvedValue({ data: { children: mockChildren } });

        const { result } = renderHook(() =>
          useDataLoader(ROOT_PAGE_ID, ALL_PAGES_COUNT),
        );

        // Call getChildrenWithData multiple times with the same ID
        await getDataLoader(result).getChildrenWithData('parent-id');
        await getDataLoader(result).getChildrenWithData('parent-id');
        await getDataLoader(result).getChildrenWithData('parent-id');

        // API should only be called once due to caching
        expect(mockApiv3Get).toHaveBeenCalledTimes(1);
      });

      test('should call API once per unique itemId', async () => {
        const mockChildren1 = [createMockPage('child-1', '/parent1/child-1')];
        const mockChildren2 = [createMockPage('child-2', '/parent2/child-2')];
        const mockChildren3 = [createMockPage('child-3', '/parent3/child-3')];

        mockApiv3Get
          .mockResolvedValueOnce({ data: { children: mockChildren1 } })
          .mockResolvedValueOnce({ data: { children: mockChildren2 } })
          .mockResolvedValueOnce({ data: { children: mockChildren3 } });

        const { result } = renderHook(() =>
          useDataLoader(ROOT_PAGE_ID, ALL_PAGES_COUNT),
        );

        // Call getChildrenWithData for different IDs
        await getDataLoader(result).getChildrenWithData('parent-1');
        await getDataLoader(result).getChildrenWithData('parent-2');
        await getDataLoader(result).getChildrenWithData('parent-3');

        // API should be called once per unique ID
        expect(mockApiv3Get).toHaveBeenCalledTimes(3);
      });

      test('should deduplicate concurrent requests for the same itemId', async () => {
        const mockChildren = [createMockPage('child-1', '/parent/child-1')];

        // Create a promise that we can resolve manually
        let resolvePromise: ((value: unknown) => void) | undefined;
        const delayedPromise = new Promise((resolve) => {
          resolvePromise = resolve;
        });

        mockApiv3Get.mockReturnValue(delayedPromise);

        const { result } = renderHook(() =>
          useDataLoader(ROOT_PAGE_ID, ALL_PAGES_COUNT),
        );

        // Start multiple concurrent requests
        const promise1 = getDataLoader(result).getChildrenWithData('parent-id');
        const promise2 = getDataLoader(result).getChildrenWithData('parent-id');
        const promise3 = getDataLoader(result).getChildrenWithData('parent-id');

        // Resolve the API call
        resolvePromise?.({ data: { children: mockChildren } });

        // Wait for all promises
        const [result1, result2, result3] = await Promise.all([
          promise1,
          promise2,
          promise3,
        ]);

        // All should return the same data
        expect(result1).toEqual(result2);
        expect(result2).toEqual(result3);

        // API should only be called once
        expect(mockApiv3Get).toHaveBeenCalledTimes(1);
      });

      test('should call API again after cache is cleared', async () => {
        const mockChildren = [createMockPage('child-1', '/parent/child-1')];
        mockApiv3Get.mockResolvedValue({ data: { children: mockChildren } });

        const { result } = renderHook(() =>
          useDataLoader(ROOT_PAGE_ID, ALL_PAGES_COUNT),
        );

        // First call
        await getDataLoader(result).getChildrenWithData('parent-id');
        expect(mockApiv3Get).toHaveBeenCalledTimes(1);

        // Clear cache for specific ID
        clearChildrenCache(['parent-id']);

        // Second call after cache clear
        await getDataLoader(result).getChildrenWithData('parent-id');
        expect(mockApiv3Get).toHaveBeenCalledTimes(2);
      });

      test('should call API again after all cache is cleared', async () => {
        const mockChildren1 = [createMockPage('child-1', '/parent1/child-1')];
        const mockChildren2 = [createMockPage('child-2', '/parent2/child-2')];

        mockApiv3Get
          .mockResolvedValueOnce({ data: { children: mockChildren1 } })
          .mockResolvedValueOnce({ data: { children: mockChildren2 } })
          .mockResolvedValueOnce({ data: { children: mockChildren1 } })
          .mockResolvedValueOnce({ data: { children: mockChildren2 } });

        const { result } = renderHook(() =>
          useDataLoader(ROOT_PAGE_ID, ALL_PAGES_COUNT),
        );

        // First calls
        await getDataLoader(result).getChildrenWithData('parent-1');
        await getDataLoader(result).getChildrenWithData('parent-2');
        expect(mockApiv3Get).toHaveBeenCalledTimes(2);

        // Clear all cache
        clearChildrenCache();

        // Calls after cache clear
        await getDataLoader(result).getChildrenWithData('parent-1');
        await getDataLoader(result).getChildrenWithData('parent-2');
        expect(mockApiv3Get).toHaveBeenCalledTimes(4);
      });
    });

    describe('dataLoader reference stability', () => {
      test('should return stable dataLoader reference when props do not change', () => {
        const { result, rerender } = renderHook(() =>
          useDataLoader(ROOT_PAGE_ID, ALL_PAGES_COUNT),
        );

        const firstDataLoader = result.current;

        // Rerender with same props
        rerender();

        const secondDataLoader = result.current;

        // Should be the same reference
        expect(firstDataLoader).toBe(secondDataLoader);
      });

      test('should return new dataLoader reference when rootPageId changes', () => {
        const { result, rerender } = renderHook(
          ({ rootPageId }) => useDataLoader(rootPageId, ALL_PAGES_COUNT),
          { initialProps: { rootPageId: ROOT_PAGE_ID } },
        );

        const firstDataLoader = result.current;

        // Rerender with different rootPageId
        rerender({ rootPageId: 'new-root-page-id' });

        const secondDataLoader = result.current;

        // Should be a new reference
        expect(firstDataLoader).not.toBe(secondDataLoader);
      });

      test('should return new dataLoader reference when allPagesCount changes', () => {
        const { result, rerender } = renderHook(
          ({ allPagesCount }) => useDataLoader(ROOT_PAGE_ID, allPagesCount),
          { initialProps: { allPagesCount: ALL_PAGES_COUNT } },
        );

        const firstDataLoader = result.current;

        // Rerender with different allPagesCount
        rerender({ allPagesCount: 200 });

        const secondDataLoader = result.current;

        // Should be a new reference
        expect(firstDataLoader).not.toBe(secondDataLoader);
      });
    });

    describe('error handling', () => {
      test('should remove cache entry on API error', async () => {
        const error = new Error('API Error');
        mockApiv3Get.mockRejectedValueOnce(error).mockResolvedValueOnce({
          data: { children: [createMockPage('child-1', '/parent/child-1')] },
        });

        const { result } = renderHook(() =>
          useDataLoader(ROOT_PAGE_ID, ALL_PAGES_COUNT),
        );

        // First call - should fail
        await expect(
          getDataLoader(result).getChildrenWithData('parent-id'),
        ).rejects.toThrow('API Error');

        // Second call - should retry since cache entry was removed
        const children = await getDataLoader(result).getChildrenWithData('parent-id');

        expect(children).toHaveLength(1);
        expect(mockApiv3Get).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('clearChildrenCache', () => {
    test('should clear specific cache entries', async () => {
      const mockChildren = [createMockPage('child-1', '/parent/child-1')];
      mockApiv3Get.mockResolvedValue({ data: { children: mockChildren } });

      const { result } = renderHook(() =>
        useDataLoader(ROOT_PAGE_ID, ALL_PAGES_COUNT),
      );

      // Populate cache
      await getDataLoader(result).getChildrenWithData('parent-1');
      await getDataLoader(result).getChildrenWithData('parent-2');
      expect(mockApiv3Get).toHaveBeenCalledTimes(2);

      // Clear only parent-1
      clearChildrenCache(['parent-1']);

      // parent-1 should call API again, parent-2 should use cache
      await getDataLoader(result).getChildrenWithData('parent-1');
      await getDataLoader(result).getChildrenWithData('parent-2');
      expect(mockApiv3Get).toHaveBeenCalledTimes(3);
    });

    test('should clear all cache entries when called without arguments', async () => {
      const mockChildren = [createMockPage('child-1', '/parent/child-1')];
      mockApiv3Get.mockResolvedValue({ data: { children: mockChildren } });

      const { result } = renderHook(() =>
        useDataLoader(ROOT_PAGE_ID, ALL_PAGES_COUNT),
      );

      // Populate cache
      await getDataLoader(result).getChildrenWithData('parent-1');
      await getDataLoader(result).getChildrenWithData('parent-2');
      expect(mockApiv3Get).toHaveBeenCalledTimes(2);

      // Clear all cache
      clearChildrenCache();

      // Both should call API again
      await getDataLoader(result).getChildrenWithData('parent-1');
      await getDataLoader(result).getChildrenWithData('parent-2');
      expect(mockApiv3Get).toHaveBeenCalledTimes(4);
    });
  });

  describe('placeholder node for page creation', () => {
    test('should prepend placeholder node when parent is in creating mode', async () => {
      const mockChildren = [createMockPage('existing-child', '/parent/existing')];
      mockApiv3Get.mockResolvedValue({ data: { children: mockChildren } });

      // Set creating state BEFORE rendering the hook
      mockCreatingParentId = 'parent-id';
      mockCreatingParentPath = '/parent';

      const { result } = renderHook(() =>
        useDataLoader(ROOT_PAGE_ID, ALL_PAGES_COUNT),
      );

      const children = await getDataLoader(result).getChildrenWithData('parent-id');

      // Should have placeholder + existing children
      expect(children).toHaveLength(2);
      // Placeholder should be first
      expect(children[0].id).toBe(CREATING_PAGE_VIRTUAL_ID);
      expect(children[0].data._id).toBe(CREATING_PAGE_VIRTUAL_ID);
      expect(children[0].data.parent).toBe('parent-id');
      expect(children[0].data.path).toBe('/parent/');
      // Existing child should be second
      expect(children[1].id).toBe('existing-child');
    });

    test('should not add placeholder when parent is not in creating mode', async () => {
      const mockChildren = [createMockPage('existing-child', '/parent/existing')];
      mockApiv3Get.mockResolvedValue({ data: { children: mockChildren } });

      // Creating state is null (not creating)
      mockCreatingParentId = null;
      mockCreatingParentPath = null;

      const { result } = renderHook(() =>
        useDataLoader(ROOT_PAGE_ID, ALL_PAGES_COUNT),
      );

      const children = await getDataLoader(result).getChildrenWithData('parent-id');

      // Should only have existing children, no placeholder
      expect(children).toHaveLength(1);
      expect(children[0].id).toBe('existing-child');
    });

    test('should not add placeholder to different parent', async () => {
      const mockChildren = [createMockPage('existing-child', '/other/existing')];
      mockApiv3Get.mockResolvedValue({ data: { children: mockChildren } });

      // Creating under 'parent-id', but fetching children of 'other-id'
      mockCreatingParentId = 'parent-id';
      mockCreatingParentPath = '/parent';

      const { result } = renderHook(() =>
        useDataLoader(ROOT_PAGE_ID, ALL_PAGES_COUNT),
      );

      const children = await getDataLoader(result).getChildrenWithData('other-id');

      // Should only have existing children, no placeholder
      expect(children).toHaveLength(1);
      expect(children[0].id).toBe('existing-child');
    });

    test('should add placeholder to empty parent (no existing children)', async () => {
      // Parent has no existing children
      mockApiv3Get.mockResolvedValue({ data: { children: [] } });

      // Set creating state
      mockCreatingParentId = 'empty-parent-id';
      mockCreatingParentPath = '/empty-parent';

      const { result } = renderHook(() =>
        useDataLoader(ROOT_PAGE_ID, ALL_PAGES_COUNT),
      );

      const children = await getDataLoader(result).getChildrenWithData('empty-parent-id');

      // Should have only the placeholder
      expect(children).toHaveLength(1);
      expect(children[0].id).toBe(CREATING_PAGE_VIRTUAL_ID);
      expect(children[0].data.parent).toBe('empty-parent-id');
      expect(children[0].data.path).toBe('/empty-parent/');
    });

    test('should read creating state via refs when called after state change', async () => {
      const mockChildren = [createMockPage('existing-child', '/parent/existing')];
      mockApiv3Get.mockResolvedValue({ data: { children: mockChildren } });

      // Render hook WITHOUT creating state
      const { result, rerender } = renderHook(() =>
        useDataLoader(ROOT_PAGE_ID, ALL_PAGES_COUNT),
      );

      // First call - no placeholder
      clearChildrenCache();
      const childrenBefore = await getDataLoader(result).getChildrenWithData('parent-id');
      expect(childrenBefore).toHaveLength(1);
      expect(childrenBefore[0].id).toBe('existing-child');

      // Now set creating state
      mockCreatingParentId = 'parent-id';
      mockCreatingParentPath = '/parent';

      // Rerender to update refs
      rerender();

      // Clear cache to force re-fetch
      clearChildrenCache();

      // Second call - should have placeholder because refs are updated
      const childrenAfter = await getDataLoader(result).getChildrenWithData('parent-id');
      expect(childrenAfter).toHaveLength(2);
      expect(childrenAfter[0].id).toBe(CREATING_PAGE_VIRTUAL_ID);
      expect(childrenAfter[1].id).toBe('existing-child');
    });

    test('dataLoader reference should remain stable when creating state changes', () => {
      // Render hook WITHOUT creating state
      const { result, rerender } = renderHook(() =>
        useDataLoader(ROOT_PAGE_ID, ALL_PAGES_COUNT),
      );

      const firstDataLoader = result.current;

      // Change creating state
      mockCreatingParentId = 'some-parent';
      mockCreatingParentPath = '/some-parent';

      // Rerender
      rerender();

      const secondDataLoader = result.current;

      // DataLoader reference should be STABLE (same reference)
      // This is critical to prevent headless-tree from refetching all data
      expect(firstDataLoader).toBe(secondDataLoader);
    });
  });
});
