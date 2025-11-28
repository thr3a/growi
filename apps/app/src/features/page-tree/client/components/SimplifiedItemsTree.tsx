import type { FC } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import {
  asyncDataLoaderFeature,
  hotkeysCoreFeature,
  renamingFeature,
  selectionFeature,
} from '@headless-tree/core';
import { useTree } from '@headless-tree/react';
import { useVirtualizer } from '@tanstack/react-virtual';

import type { IPageForTreeItem } from '~/interfaces/page';
import { useSWRxRootPage } from '~/stores/page-listing';

import { ROOT_PAGE_VIRTUAL_ID } from '../../constants';
import { useAutoExpandAncestors } from '../hooks/use-auto-expand-ancestors';
import { useDataLoader } from '../hooks/use-data-loader';
import { useExpandParentOnCreate } from '../hooks/use-expand-parent-on-create';
import { useScrollToSelectedItem } from '../hooks/use-scroll-to-selected-item';
import { useTreeItemHandlers } from '../hooks/use-tree-item-handlers';
import type { TreeItemProps } from '../interfaces';
import {
  usePageTreeInformationGeneration,
  usePageTreeRevalidationEffect,
} from '../states/page-tree-update';
import { useTriggerTreeRebuild } from '../states/tree-rebuild';

// Stable features array to avoid recreating on every render
const TREE_FEATURES = [
  asyncDataLoaderFeature,
  selectionFeature,
  hotkeysCoreFeature,
  renamingFeature,
];

// Stable createLoadingItemData function
const createLoadingItemData = (): IPageForTreeItem => ({
  _id: '',
  path: 'Loading...',
  parent: '',
  descendantCount: 0,
  grant: 1,
  isEmpty: false,
  wip: false,
});

type Props = {
  targetPath: string;
  targetPathOrId?: string;
  isWipPageShown?: boolean;
  isEnableActions?: boolean;
  isReadOnlyUser?: boolean;
  CustomTreeItem: React.FunctionComponent<TreeItemProps>;
  estimateTreeItemSize: () => number;
  scrollerElem?: HTMLElement | null;
};

export const SimplifiedItemsTree: FC<Props> = (props: Props) => {
  const {
    targetPath,
    targetPathOrId,
    isWipPageShown = true,
    isEnableActions = false,
    isReadOnlyUser = false,
    CustomTreeItem,
    estimateTreeItemSize,
    scrollerElem,
  } = props;

  const triggerTreeRebuild = useTriggerTreeRebuild();

  const { data: rootPageResult } = useSWRxRootPage({ suspense: true });
  const rootPage = rootPageResult?.rootPage;
  const rootPageId = rootPage?._id ?? ROOT_PAGE_VIRTUAL_ID;
  const allPagesCount = rootPage?.descendantCount ?? 0;

  const dataLoader = useDataLoader(rootPageId, allPagesCount);

  // Tree item handlers (rename, create, etc.) with stable callbacks for headless-tree
  // Note: triggerTreeRebuild is stable (from useSetAtom), so no need for useCallback wrapper
  const { getItemName, isItemFolder, handleRename, creatingParentId } =
    useTreeItemHandlers(triggerTreeRebuild);

  // Stable initial state
  const initialState = useMemo(
    () => ({ expandedItems: [ROOT_PAGE_VIRTUAL_ID] }),
    [],
  );

  const tree = useTree<IPageForTreeItem>({
    rootItemId: ROOT_PAGE_VIRTUAL_ID,
    getItemName,
    initialState,
    isItemFolder,
    createLoadingItemData,
    dataLoader,
    onRename: handleRename,
    features: TREE_FEATURES,
  });

  // Track local generation number
  const localGenerationRef = useRef(1);
  const globalGeneration = usePageTreeInformationGeneration();

  // Refetch data when global generation is updated
  usePageTreeRevalidationEffect(tree, localGenerationRef.current, {
    // Update local generation number after revalidation
    onRevalidated: () => {
      localGenerationRef.current = globalGeneration;
    },
  });

  // Expand parent item when page creation is initiated
  useExpandParentOnCreate({
    tree,
    creatingParentId,
    onTreeUpdated: triggerTreeRebuild,
  });

  const items = tree.getItems();

  // Track items count to detect when async data loading completes
  const prevItemsCountRef = useRef(items.length);
  useEffect(() => {
    if (items.length !== prevItemsCountRef.current) {
      prevItemsCountRef.current = items.length;
      // Trigger re-render when items count changes (e.g., after async load completes)
      triggerTreeRebuild();
    }
  }, [items.length, triggerTreeRebuild]);

  // Auto-expand items that are ancestors of targetPath
  // Note: triggerTreeRebuild is stable, no need for useCallback wrapper
  useAutoExpandAncestors({
    items,
    targetPath,
    onExpanded: triggerTreeRebuild,
  });

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollerElem ?? null,
    estimateSize: estimateTreeItemSize,
    overscan: 5,
  });

  // Scroll to selected item on mount or when targetPathOrId changes
  useScrollToSelectedItem({ targetPathOrId, items, virtualizer });

  return (
    <div {...tree.getContainerProps()} className="list-group">
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
            <CustomTreeItem
              item={item}
              targetPath={targetPath}
              targetPathOrId={targetPathOrId}
              isWipPageShown={isWipPageShown}
              isEnableActions={isEnableActions}
              isReadOnlyUser={isReadOnlyUser}
              onToggle={triggerTreeRebuild}
            />
          </div>
        );
      })}
    </div>
  );
};
