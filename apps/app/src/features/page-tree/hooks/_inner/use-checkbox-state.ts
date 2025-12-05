import { useCallback, useEffect, useState } from 'react';

import type { IPageForTreeItem } from '~/interfaces/page';

type TreeInstance = {
  getItemInstance: (
    id: string,
  ) => { getItemData: () => IPageForTreeItem } | undefined;
};

export type UseCheckboxStateOptions = {
  enabled: boolean;
  initialCheckedItems: string[];
};

export type UseCheckboxStateReturn = {
  checkedItemIds: string[];
  setCheckedItems: ((itemIds: string[]) => void) | undefined;
};

/**
 * Hook to manage checkbox state for headless-tree.
 * Provides state tracking and setter callback for checked items.
 */
export const useCheckboxState = (
  options: UseCheckboxStateOptions,
): UseCheckboxStateReturn => {
  const { enabled, initialCheckedItems } = options;

  // State to track checked items for re-rendering
  const [checkedItemIds, setCheckedItemIds] =
    useState<string[]>(initialCheckedItems);

  // Callback to update checked items state (triggers re-render)
  const handleSetCheckedItems = useCallback((itemIds: string[]) => {
    setCheckedItemIds(itemIds);
  }, []);

  return {
    checkedItemIds,
    setCheckedItems: enabled ? handleSetCheckedItems : undefined,
  };
};

export type UseCheckboxChangeNotificationOptions = {
  enabled: boolean;
  checkedItemIds: string[];
  tree: TreeInstance;
  onCheckedItemsChange?: (checkedItems: IPageForTreeItem[]) => void;
};

/**
 * Hook to notify parent when checked items change.
 */
export const useCheckboxChangeNotification = (
  options: UseCheckboxChangeNotificationOptions,
): void => {
  const { enabled, checkedItemIds, tree, onCheckedItemsChange } = options;

  useEffect(() => {
    if (!enabled || onCheckedItemsChange == null) {
      return;
    }

    const checkedPages = checkedItemIds
      .map((id) => tree.getItemInstance(id)?.getItemData())
      .filter((page): page is IPageForTreeItem => page != null);
    onCheckedItemsChange(checkedPages);
  }, [enabled, checkedItemIds, onCheckedItemsChange, tree]);
};
