import { Suspense, useCallback, useState } from 'react';

import ItemsTreeContentSkeleton from '~/client/components/ItemsTree/ItemsTreeContentSkeleton';
import { SimplifiedItemsTree } from '~/features/page-tree/components';
import type { IPageForTreeItem } from '~/interfaces/page';

import {
  SimplifiedTreeItemWithCheckbox,
  simplifiedTreeItemWithCheckboxSize,
} from './SimplifiedTreeItemWithCheckbox';

type Props = {
  isEnableActions: boolean;
  isReadOnlyUser: boolean;
  initialCheckedItems: string[];
  onCheckedItemsChange: (checkedPages: IPageForTreeItem[]) => void;
};

export const PageTreeSelectionTree = (props: Props): JSX.Element => {
  const {
    isEnableActions,
    isReadOnlyUser,
    initialCheckedItems,
    onCheckedItemsChange,
  } = props;

  // Scroll container for virtualization
  const [scrollerElem, setScrollerElem] = useState<HTMLElement | null>(null);

  const estimateTreeItemSize = useCallback(
    () => simplifiedTreeItemWithCheckboxSize,
    [],
  );

  return (
    <div className="page-tree-container" ref={setScrollerElem}>
      {scrollerElem != null && (
        <Suspense fallback={<ItemsTreeContentSkeleton />}>
          <SimplifiedItemsTree
            targetPath="/"
            isEnableActions={isEnableActions}
            isReadOnlyUser={isReadOnlyUser}
            CustomTreeItem={SimplifiedTreeItemWithCheckbox}
            estimateTreeItemSize={estimateTreeItemSize}
            scrollerElem={scrollerElem}
            enableCheckboxes
            initialCheckedItems={initialCheckedItems}
            onCheckedItemsChange={onCheckedItemsChange}
          />
        </Suspense>
      )}
    </div>
  );
};
