import { useCallback } from 'react';
import type { TreeDataLoader } from '@headless-tree/core';

import { apiv3Get } from '~/client/util/apiv3-client';
import type { IPageForTreeItem } from '~/interfaces/page';

import { ROOT_PAGE_VIRTUAL_ID } from '../../constants';

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

export const useDataLoader = (
  rootPageId: string,
  allPagesCount: number,
): TreeDataLoader<IPageForTreeItem> => {
  const getItem = useCallback(
    async (itemId: string): Promise<IPageForTreeItem> => {
      // Virtual root (should rarely be called since it's provided by getChildrenWithData)
      if (itemId === ROOT_PAGE_VIRTUAL_ID) {
        return constructRootPageForVirtualRoot(rootPageId, allPagesCount);
      }

      // For all pages (including root), use /page-listing/item endpoint
      // Note: This should rarely be called thanks to getChildrenWithData caching
      const response = await apiv3Get<{ item: IPageForTreeItem }>(
        '/page-listing/item',
        { id: itemId },
      );
      return response.data.item;
    },
    [allPagesCount, rootPageId],
  );

  const getChildrenWithData = useCallback(
    async (itemId: string) => {
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

      // For all pages (including root), fetch children using their _id
      const response = await apiv3Get<{ children: IPageForTreeItem[] }>(
        '/page-listing/children',
        { id: itemId },
      );
      return response.data.children.map((child) => ({
        id: child._id,
        data: child,
      }));
    },
    [allPagesCount, rootPageId],
  );

  return { getItem, getChildrenWithData };
};
