import type { FC } from 'react';
import { useCallback, useState } from 'react';
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
import { useDataLoader } from '../hooks/use-data-loader';
import { usePageRename } from '../hooks/use-page-rename';
import { useScrollToSelectedItem } from '../hooks/use-scroll-to-selected-item';
import type { TreeItemProps } from '../interfaces';
import {
  usePageTreeInformationGeneration,
  usePageTreeRevalidationEffect,
} from '../states/page-tree-update';

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
  const { rename, validateName, getPageName } = usePageRename();

  // onRename handler for headless-tree
  const handleRename = useCallback(
    async (item, newValue: string) => {
      await rename(item, newValue);
      // Trigger re-render after rename
      setRebuildTrigger((prev) => prev + 1);
    },
    [rename],
  );

  const tree = useTree<IPageForTreeItem>({
    rootItemId: ROOT_PAGE_VIRTUAL_ID,
    getItemName: (item) => getPageName(item),
    initialState: { expandedItems: [ROOT_PAGE_VIRTUAL_ID] },
    isItemFolder: (item) => item.getItemData().descendantCount > 0,
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
    dataLoader,
    onRename: handleRename,
    features: [
      asyncDataLoaderFeature,
      selectionFeature,
      hotkeysCoreFeature,
      renamingFeature,
    ],
  });

  // Track local generation number
  const [localGeneration, setLocalGeneration] = useState(1);
  const globalGeneration = usePageTreeInformationGeneration();

  // Refetch data when global generation is updated
  usePageTreeRevalidationEffect(tree, localGeneration, {
    // Update local generation number after revalidation
    onRevalidated: () => setLocalGeneration(globalGeneration),
  });

  const items = tree.getItems();

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
              validateName={validateName}
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
