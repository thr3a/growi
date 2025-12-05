import type { FC } from 'react';
import { useMemo } from 'react';
import { useTree } from '@headless-tree/react';
import { useVirtualizer } from '@tanstack/react-virtual';

import type { IPageForTreeItem } from '~/interfaces/page';
import { useSWRxRootPage } from '~/stores/page-listing';

import { ROOT_PAGE_VIRTUAL_ID } from '../constants/_inner';
import {
  useAutoExpandAncestors,
  useCheckboxChangeNotification,
  useCheckboxState,
  useDataLoader,
  useExpandParentOnCreate,
  useScrollToSelectedItem,
  useTreeFeatures,
  useTreeItemHandlers,
  useTreeRevalidation,
} from '../hooks/_inner';
import type { TreeItemProps } from '../interfaces';
import { useTriggerTreeRebuild } from '../states/_inner';

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
  // Feature options
  enableRenaming?: boolean;
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
    enableRenaming = false,
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
  const { getItemName, isItemFolder, handleRename, creatingParentId } =
    useTreeItemHandlers(triggerTreeRebuild);

  // Configure tree features based on options
  const features = useTreeFeatures({
    enableRenaming,
    enableCheckboxes,
  });

  // Manage checkbox state (must be called before useTree to get setCheckedItems)
  const { checkedItemIds, setCheckedItems } = useCheckboxState({
    enabled: enableCheckboxes,
    initialCheckedItems,
  });

  // Stable initial state
  // biome-ignore lint/correctness/useExhaustiveDependencies: initialCheckedItems is intentionally not in deps to avoid reinitializing on every change
  const initialState = useMemo(
    () => ({
      expandedItems: [ROOT_PAGE_VIRTUAL_ID],
      ...(enableCheckboxes ? { checkedItems: initialCheckedItems } : {}),
    }),
    [enableCheckboxes],
  );

  const tree = useTree<IPageForTreeItem>({
    rootItemId: ROOT_PAGE_VIRTUAL_ID,
    getItemName,
    initialState,
    isItemFolder,
    createLoadingItemData,
    dataLoader,
    onRename: handleRename,
    features,
    // Checkbox configuration
    canCheckFolders: enableCheckboxes,
    propagateCheckedState: false,
    setCheckedItems,
  });

  // Notify parent when checked items change
  useCheckboxChangeNotification({
    enabled: enableCheckboxes,
    checkedItemIds,
    tree,
    onCheckedItemsChange,
  });

  // Handle tree revalidation and items count tracking
  useTreeRevalidation({ tree, triggerTreeRebuild });

  // Expand parent item when page creation is initiated
  useExpandParentOnCreate({
    tree,
    creatingParentId,
    onTreeUpdated: triggerTreeRebuild,
  });

  const items = tree.getItems();

  // Auto-expand items that are ancestors of targetPath
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

        const treeItemProps = item.getProps();

        return (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            ref={(node) => {
              virtualizer.measureElement(node);
              if (node && treeItemProps.ref) {
                (treeItemProps.ref as (node: HTMLElement) => void)(node);
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
