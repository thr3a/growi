import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  asyncDataLoaderFeature,
  checkboxesFeature,
  hotkeysCoreFeature,
  renamingFeature,
  selectionFeature,
} from '@headless-tree/core';
import { useTree } from '@headless-tree/react';
import { useVirtualizer } from '@tanstack/react-virtual';

import type { IPageForTreeItem } from '~/interfaces/page';
import { useSWRxRootPage } from '~/stores/page-listing';

import { ROOT_PAGE_VIRTUAL_ID } from '../constants/_inner';
import {
  useAutoExpandAncestors,
  useDataLoader,
  useExpandParentOnCreate,
  useScrollToSelectedItem,
  useTreeItemHandlers,
} from '../hooks/_inner';
import type { TreeItemProps } from '../interfaces';
import { useTriggerTreeRebuild } from '../states/_inner';
import {
  usePageTreeInformationGeneration,
  usePageTreeRevalidationEffect,
} from '../states/page-tree-update';

// Base features for all tree variants
const BASE_FEATURES = [
  asyncDataLoaderFeature,
  selectionFeature,
  hotkeysCoreFeature,
  renamingFeature,
];

// Features with checkboxes support
const FEATURES_WITH_CHECKBOXES = [...BASE_FEATURES, checkboxesFeature];

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
  // Checkbox feature options
  enableCheckboxes?: boolean;
  initialCheckedItems?: string[];
  onCheckedItemsChange?: (checkedItems: IPageForTreeItem[]) => void;
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
    enableCheckboxes = false,
    initialCheckedItems = [],
    onCheckedItemsChange,
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
  // biome-ignore lint/correctness/useExhaustiveDependencies: initialCheckedItems is intentionally not in deps to avoid reinitializing on every change
  const initialState = useMemo(
    () => ({
      expandedItems: [ROOT_PAGE_VIRTUAL_ID],
      ...(enableCheckboxes ? { checkedItems: initialCheckedItems } : {}),
    }),
    [enableCheckboxes],
  );

  // State to track checked items for re-rendering
  const [checkedItemIds, setCheckedItemIds] =
    useState<string[]>(initialCheckedItems);

  // Callback to update checked items state (triggers re-render)
  const handleSetCheckedItems = useCallback((itemIds: string[]) => {
    setCheckedItemIds(itemIds);
  }, []);

  const tree = useTree<IPageForTreeItem>({
    rootItemId: ROOT_PAGE_VIRTUAL_ID,
    getItemName,
    initialState,
    isItemFolder,
    createLoadingItemData,
    dataLoader,
    onRename: handleRename,
    features: enableCheckboxes ? FEATURES_WITH_CHECKBOXES : BASE_FEATURES,
    // Checkbox configuration: prevent folder auto-check to avoid selecting all descendants
    canCheckFolders: enableCheckboxes,
    propagateCheckedState: false,
    // Custom setter to track checked items changes
    setCheckedItems: enableCheckboxes ? handleSetCheckedItems : undefined,
  });

  // Notify parent when checked items change
  useEffect(() => {
    if (!enableCheckboxes || onCheckedItemsChange == null) {
      return;
    }

    const checkedPages = checkedItemIds
      .map((id) => tree.getItemInstance(id)?.getItemData())
      .filter((page): page is IPageForTreeItem => page != null);
    onCheckedItemsChange(checkedPages);
  }, [enableCheckboxes, checkedItemIds, onCheckedItemsChange, tree]);

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
