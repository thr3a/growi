import type { FC } from 'react';
import { useCallback, useRef } from 'react';

import { asyncDataLoaderFeature } from '@headless-tree/core';
import { useTree } from '@headless-tree/react';
import { useVirtualizer } from '@tanstack/react-virtual';

import { apiv3Get } from '~/client/util/apiv3-client';
import type { IPageForTreeItem } from '~/interfaces/page';

import { SimplifiedTreeItem } from './SimplifiedTreeItem';

import styles from './SimplifiedItemsTree.module.scss';


type Props = {
  targetPathOrId?: string | null;
};

export const SimplifiedItemsTree: FC<Props> = ({ targetPathOrId }) => {
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const getItem = useCallback(async (itemId: string): Promise<IPageForTreeItem> => {
    if (itemId === '/') {
      const response = await apiv3Get<{ rootPage: IPageForTreeItem }>('/page-listing/root');
      return response.data.rootPage;
    }

    const response = await apiv3Get<{ item: IPageForTreeItem }>('/page-listing/item', { id: itemId });
    return response.data.item;
  }, []);

  const getChildrenWithData = useCallback(async (itemId: string) => {
    if (itemId === '/') {
      const rootResponse = await apiv3Get<{ rootPage: IPageForTreeItem }>('/page-listing/root');
      const rootPageId = rootResponse.data.rootPage._id;
      const childrenResponse = await apiv3Get<{ children: IPageForTreeItem[] }>('/page-listing/children', { id: rootPageId });
      return childrenResponse.data.children.map(child => ({
        id: child._id,
        data: child,
      }));
    }

    const response = await apiv3Get<{ children: IPageForTreeItem[] }>('/page-listing/children', { id: itemId });
    return response.data.children.map(child => ({
      id: child._id,
      data: child,
    }));
  }, []);

  const tree = useTree<IPageForTreeItem>({
    rootItemId: '/',
    getItemName: item => item.getItemData().path,
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
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <SimplifiedTreeItem
                item={itemData}
                isSelected={isSelected}
                level={item.getItemMeta().level}
                isExpanded={item.isExpanded()}
                isFolder={item.isFolder()}
                onToggle={() => {
                  if (item.isExpanded()) {
                    item.collapse();
                  }
                  else {
                    item.expand();
                  }
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
