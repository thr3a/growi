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
import { useScrollToSelectedItem } from '../hooks/use-scroll-to-selected-item';
import { useTreeItemHandlers } from '../hooks/use-tree-item-handlers';
import type { TreeItemProps } from '../interfaces';
import { invalidatePageTreeChildren } from '../services';
import {
  usePageTreeInformationGeneration,
  usePageTreeRevalidationEffect,
} from '../states/page-tree-update';
import {
  useTreeRebuildTrigger,
  useTriggerTreeRebuild,
} from '../states/tree-rebuild';

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

  // Subscribe to rebuild trigger to re-render when tree structure changes
  useTreeRebuildTrigger();
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

  // Track previous creatingParentId to detect changes
  const prevCreatingParentIdRef = useRef<string | null>(null);

  // Expand and rebuild tree when creatingParentId changes
  // IMPORTANT: This effect intentionally has no dependency array and uses a ref to track
  // previous value. This prevents infinite loops that would occur if we put [creatingParentId, tree]
  // in deps, because tree object changes on every render, causing the effect to re-run continuously.
  // See: SimplifiedItemsTree.spec.tsx "page creation (creatingParentId)" tests
  useEffect(() => {
    // Only run when creatingParentId actually changes (not on every render)
    if (creatingParentId === prevCreatingParentIdRef.current) return;
    prevCreatingParentIdRef.current = creatingParentId;

    if (creatingParentId == null) return;

    // Rebuild tree first to re-evaluate isItemFolder
    tree.rebuildTree();

    // Then expand the parent item
    const parentItem = tree.getItemInstance(creatingParentId);
    if (parentItem != null && !parentItem.isExpanded()) {
      parentItem.expand();
    }

    // Clear cache for this parent and invalidate children to load placeholder
    invalidatePageTreeChildren([creatingParentId]);
    parentItem?.invalidateChildrenIds(true);

    // Trigger re-render
    triggerTreeRebuild();
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
