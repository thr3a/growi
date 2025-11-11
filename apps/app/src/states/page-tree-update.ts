import { useCallback, useEffect } from 'react';
import type { TreeInstance } from '@headless-tree/core';
import { atom, useAtomValue, useSetAtom } from 'jotai';

import { ROOT_PAGE_VIRTUAL_ID } from '~/constants/page-tree';

// Update generation number
const generationAtom = atom<number>(1);

// Array of IDs for last updated items
// null is a special value meaning full tree update
const lastUpdatedItemIdsAtom = atom<string[] | null>(null);

// Read-only hooks
export const usePageTreeInformationGeneration = () =>
  useAtomValue(generationAtom);

export const usePageTreeInformationLastUpdatedItemIds = () =>
  useAtomValue(lastUpdatedItemIdsAtom);

// Hook for notifying tree updates
export const usePageTreeInformationUpdate = () => {
  const setGeneration = useSetAtom(generationAtom);
  const setLastUpdatedIds = useSetAtom(lastUpdatedItemIdsAtom);

  // Notify update for specific items
  const notifyUpdateItems = useCallback(
    (itemIds: string[]) => {
      setLastUpdatedIds(itemIds);
      setGeneration((prev) => prev + 1);
    },
    [setGeneration, setLastUpdatedIds],
  );

  // Notify update for all trees
  const notifyUpdateAllTrees = useCallback(() => {
    setLastUpdatedIds(null);
    setGeneration((prev) => prev + 1);
  }, [setGeneration, setLastUpdatedIds]);

  return {
    notifyUpdateItems,
    notifyUpdateAllTrees,
  };
};

export const usePageTreeRevalidationEffect = (
  tree: TreeInstance<unknown>,
  generation: number,
  opts?: { onRevalidated?: () => void },
) => {
  const globalGeneration = useAtomValue(generationAtom);
  const globalLastUpdatedItemIds = useAtomValue(lastUpdatedItemIdsAtom);

  const { getItemInstance } = tree;

  useEffect(() => {
    if (globalGeneration <= generation) return; // Already up to date

    // Determine update scope
    const shouldUpdateAll = globalLastUpdatedItemIds == null;

    if (shouldUpdateAll) {
      // Full tree update: refetch from root
      const root = getItemInstance(ROOT_PAGE_VIRTUAL_ID);
      root?.invalidateChildrenIds(true);
    } else {
      // Partial update: refetch children of specified items
      globalLastUpdatedItemIds.forEach((itemId) => {
        const item = getItemInstance(itemId);
        item?.invalidateChildrenIds(true);
      });
    }

    opts?.onRevalidated?.();
  }, [
    globalGeneration,
    generation,
    getItemInstance,
    globalLastUpdatedItemIds,
    opts,
  ]);
};
