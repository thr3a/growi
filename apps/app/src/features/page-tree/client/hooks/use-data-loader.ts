import { useCallback } from 'react';
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

export const useDataLoader = (
  rootPageId: string,
  allPagesCount: number,
): TreeDataLoader<IPageForTreeItem> => {
  const creatingParentId = useCreatingParentId();
  const creatingParentPath = useCreatingParentPath();

  const getItem = useCallback(
    async (itemId: string): Promise<IPageForTreeItem> => {
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

      const children = response.data.children.map((child) => ({
        id: child._id,
        data: child,
      }));

      // If this parent is in "creating" mode, prepend placeholder node
      if (creatingParentId === itemId && creatingParentPath != null) {
        const placeholderData = createPlaceholderPageData(
          itemId,
          creatingParentPath,
        );
        return [
          { id: CREATING_PAGE_VIRTUAL_ID, data: placeholderData },
          ...children,
        ];
      }

      return children;
    },
    [allPagesCount, rootPageId, creatingParentId, creatingParentPath],
  );

  return { getItem, getChildrenWithData };
};
