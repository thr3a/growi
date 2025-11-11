import type { FC } from 'react';
import { useCallback, useRef, useState } from 'react';

import { asyncDataLoaderFeature } from '@headless-tree/core';
import { useTree } from '@headless-tree/react';
import { useVirtualizer } from '@tanstack/react-virtual';

import { apiv3Get } from '~/client/util/apiv3-client';
import type { IPageForTreeItem } from '~/interfaces/page';
import { useSWRxRootPage } from '~/stores/page-listing';

import { SimplifiedTreeItem } from './SimplifiedTreeItem';

import styles from './SimplifiedItemsTree.module.scss';


const ROOT_PAGE_VIRTUAL_ID = '__virtual_root__';

function constructRootPageForVirtualRoot(rootPageId: string, allPagesCount: number): IPageForTreeItem {
  return {
    _id: rootPageId,
    path: '/',
    descendantCount: allPagesCount,
    grant: 1,
    isEmpty: false,
    wip: false,
  };
}

type Props = {
  targetPath: string;
  targetPathOrId?: string | null;
  isWipPageShown?: boolean;
  isEnableActions?: boolean;
  isReadOnlyUser?: boolean;
};

export const SimplifiedItemsTree: FC<Props> = (props: Props) => {
  const {
    targetPath, targetPathOrId, isWipPageShown = true, isEnableActions = false, isReadOnlyUser = false,
  } = props;

  const scrollElementRef = useRef<HTMLDivElement>(null);
  const [, setRebuildTrigger] = useState(0);

  const { data: rootPageResult } = useSWRxRootPage({ suspense: true });
  const rootPage = rootPageResult?.rootPage;
  const rootPageId = rootPage?._id ?? ROOT_PAGE_VIRTUAL_ID;
  const allPagesCount = rootPage?.descendantCount ?? 0;

  const getItem = useCallback(async (itemId: string): Promise<IPageForTreeItem> => {
    // Virtual root (should rarely be called since it's provided by getChildrenWithData)
    if (itemId === ROOT_PAGE_VIRTUAL_ID) {
      return constructRootPageForVirtualRoot(rootPageId, allPagesCount);
    }

    // For all pages (including root), use /page-listing/item endpoint
    // Note: This should rarely be called thanks to getChildrenWithData caching
    const response = await apiv3Get<{ item: IPageForTreeItem }>('/page-listing/item', { id: itemId });
    return response.data.item;
  }, [allPagesCount, rootPageId]);

  const getChildrenWithData = useCallback(async (itemId: string) => {
    // Virtual root returns root page as its only child
    // Use actual MongoDB _id as tree item ID to avoid duplicate API calls
    if (itemId === ROOT_PAGE_VIRTUAL_ID) {
      return [{
        id: rootPageId,
        data: constructRootPageForVirtualRoot(rootPageId, allPagesCount),
      }];
    }

    // For all pages (including root), fetch children using their _id
    const response = await apiv3Get<{ children: IPageForTreeItem[] }>('/page-listing/children', { id: itemId });
    return response.data.children.map(child => ({
      id: child._id,
      data: child,
    }));
  }, [allPagesCount, rootPageId]);

  const tree = useTree<IPageForTreeItem>({
    rootItemId: ROOT_PAGE_VIRTUAL_ID,
    getItemName: item => item.getItemData().path || '/',
    initialState: { expandedItems: [ROOT_PAGE_VIRTUAL_ID] },
    isItemFolder: item => item.getItemData().descendantCount > 0,
    createLoadingItemData: () => ({
      _id: '',
      path: 'Loading...',
      parent: '',
      descendantCount: 0,
      revision: '',
      grant: 1,
      isEmpty: false,
      wip: false,
    }),
    dataLoader: {
      getItem,
      getChildrenWithData,
    },
    features: [asyncDataLoaderFeature],
  });

  const items = tree.getItems();

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => 36,
    overscan: 5,
  });

  return (
    <div
      {...tree.getContainerProps()}
      ref={scrollElementRef}
      className={styles['simplified-items-tree']}
      style={{ height: '100%', overflow: 'auto' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = items[virtualItem.index];
          const itemData = item.getItemData();

          // Skip rendering virtual root
          if (itemData._id === ROOT_PAGE_VIRTUAL_ID) {
            return null;
          }

          // Skip rendering WIP pages if not shown
          if (!isWipPageShown && itemData.wip) {
            return null;
          }

          const isSelected = targetPathOrId === itemData._id || targetPathOrId === itemData.path;
          const props = item.getProps();

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={(node) => {
                virtualizer.measureElement(node);
                if (node && props.ref) {
                  (props.ref as (node: HTMLElement) => void)(node);
                }
              }}
            >
              <SimplifiedTreeItem
                item={itemData}
                isSelected={isSelected}
                level={item.getItemMeta().level}
                isExpanded={item.isExpanded()}
                isFolder={item.isFolder()}
                targetPath={targetPath}
                targetPathOrId={targetPathOrId}
                isWipPageShown={isWipPageShown}
                isEnableActions={isEnableActions}
                isReadOnlyUser={isReadOnlyUser}
                onToggle={() => {
                  if (item.isExpanded()) {
                    item.collapse();
                  }
                  else {
                    item.expand();
                  }
                  // Trigger re-render to show/hide children
                  setRebuildTrigger(prev => prev + 1);
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
