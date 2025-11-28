import { useMemo, useRef } from 'react';
import type { TreeDataLoader } from '@headless-tree/core';

import { apiv3Get } from '~/client/util/apiv3-client';
import type { IPageForTreeItem } from '~/interfaces/page';

import { ROOT_PAGE_VIRTUAL_ID } from '../../constants';
import {
  CREATING_PAGE_VIRTUAL_ID,
  createPlaceholderPageData,
  useCreatingParentId,
  useCreatingParentPath,
} from '../states/page-tree-create';

function constructRootPageForVirtualRoot(
  rootPageId: string,
  allPagesCount: number,
): IPageForTreeItem {
  return {
    _id: rootPageId,
    path: '/',
    parent: null,
    descendantCount: allPagesCount,
    grant: 1,
    isEmpty: false,
    wip: false,
  };
}

// Cache for children data to prevent duplicate API calls
// Key: itemId, Value: { promise, data, timestamp }
type CacheEntry = {
  promise: Promise<{ id: string; data: IPageForTreeItem }[]>;
  data?: { id: string; data: IPageForTreeItem }[];
  timestamp: number;
};

// Module-level cache (persists across component remounts)
const childrenCache = new Map<string, CacheEntry>();

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Clear cache for specific item IDs or all cache
 */
export const clearChildrenCache = (itemIds?: string[]): void => {
  if (itemIds == null) {
    childrenCache.clear();
  } else {
    itemIds.forEach((id) => {
      childrenCache.delete(id);
    });
  }
};

export const useDataLoader = (
  rootPageId: string,
  allPagesCount: number,
): TreeDataLoader<IPageForTreeItem> => {
  const creatingParentId = useCreatingParentId();
  const creatingParentPath = useCreatingParentPath();

  // Use refs to avoid recreating dataLoader callbacks when creating state changes
  // The creating state is accessed via refs so that:
  // 1. The dataLoader reference stays stable (prevents headless-tree from refetching all data)
  // 2. The actual creating state is still read at execution time (when invalidateChildrenIds is called)
  const creatingParentIdRef = useRef(creatingParentId);
  const creatingParentPathRef = useRef(creatingParentPath);
  creatingParentIdRef.current = creatingParentId;
  creatingParentPathRef.current = creatingParentPath;

  // Memoize the entire dataLoader object to ensure reference stability
  // Only recreate when rootPageId or allPagesCount changes (which are truly needed for the API calls)
  const dataLoader = useMemo<TreeDataLoader<IPageForTreeItem>>(() => {
    const getItem = async (itemId: string): Promise<IPageForTreeItem> => {
      // Virtual root (should rarely be called since it's provided by getChildrenWithData)
      if (itemId === ROOT_PAGE_VIRTUAL_ID) {
        return constructRootPageForVirtualRoot(rootPageId, allPagesCount);
      }

      // Creating placeholder node - return placeholder data
      if (itemId === CREATING_PAGE_VIRTUAL_ID) {
        // This shouldn't normally be called, but return empty placeholder if it is
        return createPlaceholderPageData('', '/');
      }

      // For all pages (including root), use /page-listing/item endpoint
      // Note: This should rarely be called thanks to getChildrenWithData caching
      const response = await apiv3Get<{ item: IPageForTreeItem }>(
        '/page-listing/item',
        { id: itemId },
      );
      return response.data.item;
    };

    const fetchChildrenFromApi = async (
      itemId: string,
    ): Promise<{ id: string; data: IPageForTreeItem }[]> => {
      const response = await apiv3Get<{ children: IPageForTreeItem[] }>(
        '/page-listing/children',
        { id: itemId },
      );

      return response.data.children.map((child) => ({
        id: child._id,
        data: child,
      }));
    };

    const getChildrenWithData = async (itemId: string) => {
      // Virtual root returns root page as its only child
      // Use actual MongoDB _id as tree item ID to avoid duplicate API calls
      if (itemId === ROOT_PAGE_VIRTUAL_ID) {
        return [
          {
            id: rootPageId,
            data: constructRootPageForVirtualRoot(rootPageId, allPagesCount),
          },
        ];
      }

      // Placeholder node has no children
      if (itemId === CREATING_PAGE_VIRTUAL_ID) {
        return [];
      }

      // Check cache first
      const now = Date.now();
      const cached = childrenCache.get(itemId);

      let children: { id: string; data: IPageForTreeItem }[];

      if (cached != null && now - cached.timestamp < CACHE_TTL) {
        // Use cached data or wait for pending promise
        if (cached.data != null) {
          children = cached.data;
        } else {
          children = await cached.promise;
        }
      } else {
        // Fetch from API and cache the promise to prevent duplicate requests
        const promise = fetchChildrenFromApi(itemId);
        const entry: CacheEntry = { promise, timestamp: now };
        childrenCache.set(itemId, entry);

        try {
          children = await promise;
          // Store the resolved data in cache
          entry.data = children;
        } catch (error) {
          // Remove failed entry from cache
          childrenCache.delete(itemId);
          throw error;
        }
      }

      // If this parent is in "creating" mode, prepend placeholder node
      // Read from refs to get current value without triggering dataLoader recreation
      const currentCreatingParentId = creatingParentIdRef.current;
      const currentCreatingParentPath = creatingParentPathRef.current;
      if (
        currentCreatingParentId === itemId &&
        currentCreatingParentPath != null
      ) {
        const placeholderData = createPlaceholderPageData(
          itemId,
          currentCreatingParentPath,
        );
        return [
          { id: CREATING_PAGE_VIRTUAL_ID, data: placeholderData },
          ...children,
        ];
      }

      return children;
    };

    return { getItem, getChildrenWithData };
  }, [allPagesCount, rootPageId]);

  return dataLoader;
};
