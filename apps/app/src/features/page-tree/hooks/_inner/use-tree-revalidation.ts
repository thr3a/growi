import { useEffect, useRef } from 'react';

import {
  usePageTreeInformationGeneration,
  usePageTreeRevalidationEffect,
} from '../../states/page-tree-update';

type TreeInstance = {
  getItems: () => unknown[];
};

type UseTreeRevalidationOptions = {
  tree: TreeInstance;
  triggerTreeRebuild: () => void;
};

/**
 * Hook to handle tree revalidation when global generation changes
 * and track items count changes for async data loading
 */
export const useTreeRevalidation = (options: UseTreeRevalidationOptions) => {
  const { tree, triggerTreeRebuild } = options;

  // Track local generation number
  const localGenerationRef = useRef(1);
  const globalGeneration = usePageTreeInformationGeneration();

  // Refetch data when global generation is updated
  usePageTreeRevalidationEffect(
    tree as Parameters<typeof usePageTreeRevalidationEffect>[0],
    localGenerationRef.current,
    {
      // Update local generation number after revalidation
      onRevalidated: () => {
        localGenerationRef.current = globalGeneration;
      },
    },
  );

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
};
