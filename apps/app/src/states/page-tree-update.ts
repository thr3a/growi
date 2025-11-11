import { useCallback } from 'react';
import { atom, useAtomValue, useSetAtom } from 'jotai';

// Update generation number
const treeUpdateGenerationAtom = atom<number>(1);

// Array of IDs for last updated items
// ['*'] is a special value meaning full tree update
const lastUpdatedItemIdsAtom = atom<string[]>([]);

// Read-only hooks
export const useTreeUpdateGeneration = () => {
  return useAtomValue(treeUpdateGenerationAtom);
};

export const useLastUpdatedItemIds = () => {
  return useAtomValue(lastUpdatedItemIdsAtom);
};

// Hook for notifying tree updates
export const useNotifyTreeUpdate = () => {
  const setGeneration = useSetAtom(treeUpdateGenerationAtom);
  const setLastUpdatedIds = useSetAtom(lastUpdatedItemIdsAtom);

  // Notify update for specific items
  const notifyItemsUpdated = useCallback(
    (itemIds: string[]) => {
      setLastUpdatedIds(itemIds);
      setGeneration((prev) => prev + 1);
    },
    [setGeneration, setLastUpdatedIds],
  );

  // Notify update for all trees
  const notifyAllTreesUpdated = useCallback(() => {
    setLastUpdatedIds(['*']);
    setGeneration((prev) => prev + 1);
  }, [setGeneration, setLastUpdatedIds]);

  return {
    notifyItemsUpdated,
    notifyAllTreesUpdated,
  };
};
