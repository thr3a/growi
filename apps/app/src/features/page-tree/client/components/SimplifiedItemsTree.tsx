import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ItemInstance } from '@headless-tree/core';
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
import { clearChildrenCache, useDataLoader } from '../hooks/use-data-loader';
import { usePageCreate } from '../hooks/use-page-create';
import { usePageRename } from '../hooks/use-page-rename';
import { useScrollToSelectedItem } from '../hooks/use-scroll-to-selected-item';
import type { TreeItemProps } from '../interfaces';
import { useCreatingParentId } from '../states/page-tree-create';
import {
  usePageTreeInformationGeneration,
  usePageTreeRevalidationEffect,
} from '../states/page-tree-update';

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

  const [, setRebuildTrigger] = useState(0);

  const { data: rootPageResult } = useSWRxRootPage({ suspense: true });
  const rootPage = rootPageResult?.rootPage;
  const rootPageId = rootPage?._id ?? ROOT_PAGE_VIRTUAL_ID;
  const allPagesCount = rootPage?.descendantCount ?? 0;

  const dataLoader = useDataLoader(rootPageId, allPagesCount);

  // Page rename hook
  const { rename, getPageName } = usePageRename();

  // Page create hook
  const { createFromPlaceholder, isCreatingPlaceholder, cancelCreating } =
    usePageCreate();

  // Get creating parent id to determine if item should be treated as folder
  const creatingParentId = useCreatingParentId();

  // Use refs to stabilize callbacks passed to useTree
  // This prevents headless-tree from detecting config changes and refetching data
  const creatingParentIdRef = useRef(creatingParentId);
  creatingParentIdRef.current = creatingParentId;

  const getPageNameRef = useRef(getPageName);
  getPageNameRef.current = getPageName;

  const renameRef = useRef(rename);
  renameRef.current = rename;

  const createFromPlaceholderRef = useRef(createFromPlaceholder);
  createFromPlaceholderRef.current = createFromPlaceholder;

  const isCreatingPlaceholderRef = useRef(isCreatingPlaceholder);
  isCreatingPlaceholderRef.current = isCreatingPlaceholder;

  const cancelCreatingRef = useRef(cancelCreating);
  cancelCreatingRef.current = cancelCreating;

  // Stable getItemName callback - receives ItemInstance from headless-tree
  const getItemName = useCallback((item: ItemInstance<IPageForTreeItem>) => {
    return getPageNameRef.current(item);
  }, []);

  // Stable isItemFolder callback
  // IMPORTANT: Do NOT call item.getChildren() here as it triggers API calls for ALL visible items
  const isItemFolder = useCallback((item: ItemInstance<IPageForTreeItem>) => {
    const itemData = item.getItemData();
    const currentCreatingParentId = creatingParentIdRef.current;
    const isCreatingUnderThis = currentCreatingParentId === itemData._id;
    if (isCreatingUnderThis) return true;

    // Use descendantCount from the item data to determine if it's a folder
    // This avoids triggering getChildrenWithData API calls
    return itemData.descendantCount > 0;
  }, []);

  // Stable onRename handler for headless-tree
  // Handles both rename and create (for placeholder nodes)
  const handleRename = useCallback(
    async (item: ItemInstance<IPageForTreeItem>, newValue: string) => {
      if (isCreatingPlaceholderRef.current(item)) {
        // Placeholder node: create new page or cancel if empty
        if (newValue.trim() === '') {
          // Empty value means cancel (Esc key or blur)
          cancelCreatingRef.current();
        } else {
          await createFromPlaceholderRef.current(item, newValue);
        }
      } else {
        // Normal node: rename page
        await renameRef.current(item, newValue);
      }
      // Trigger re-render after operation
      setRebuildTrigger((prev) => prev + 1);
    },
    [],
  );

  // Stable initial state
  const initialState = useMemo(() => ({ expandedItems: [ROOT_PAGE_VIRTUAL_ID] }), []);

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
  const [localGeneration, setLocalGeneration] = useState(1);
  const globalGeneration = usePageTreeInformationGeneration();

  // Refetch data when global generation is updated
  usePageTreeRevalidationEffect(tree, localGeneration, {
    // Update local generation number after revalidation
    onRevalidated: () => setLocalGeneration(globalGeneration),
  });

  // Expand and rebuild tree when creatingParentId changes
  useEffect(() => {
    if (creatingParentId == null) return;

    const { getItemInstance, rebuildTree } = tree;

    // Rebuild tree first to re-evaluate isItemFolder
    rebuildTree();

    // Then expand the parent item
    const parentItem = getItemInstance(creatingParentId);
    if (parentItem != null && !parentItem.isExpanded()) {
      parentItem.expand();
    }

    // Clear cache for this parent and invalidate children to load placeholder
    clearChildrenCache([creatingParentId]);
    parentItem?.invalidateChildrenIds(true);

    // Trigger re-render
    setRebuildTrigger((prev) => prev + 1);
  }, [creatingParentId, tree]);

  const items = tree.getItems();

  // Track items count to detect when async data loading completes
  const prevItemsCountRef = useRef(items.length);
  useEffect(() => {
    if (items.length !== prevItemsCountRef.current) {
      prevItemsCountRef.current = items.length;
      // Trigger re-render when items count changes (e.g., after async load completes)
      setRebuildTrigger((prev) => prev + 1);
    }
  }, [items.length]);

  // Auto-expand items that are ancestors of targetPath
  const handleAutoExpanded = useCallback(() => {
    setRebuildTrigger((prev) => prev + 1);
  }, []);
  useAutoExpandAncestors({
    items,
    targetPath,
    onExpanded: handleAutoExpanded,
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
              onToggle={() => {
                // Trigger re-render to show/hide children
                setRebuildTrigger((prev) => prev + 1);
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
