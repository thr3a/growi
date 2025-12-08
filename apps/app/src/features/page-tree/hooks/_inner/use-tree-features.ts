import { useMemo } from 'react';
import type { FeatureImplementation } from '@headless-tree/core';
import {
  asyncDataLoaderFeature,
  checkboxesFeature,
  dragAndDropFeature,
  hotkeysCoreFeature,
  renamingFeature,
  selectionFeature,
} from '@headless-tree/core';

export type UseTreeFeaturesOptions = {
  enableRenaming?: boolean;
  enableCheckboxes?: boolean;
  enableDragAndDrop?: boolean;
};

/**
 * Hook to configure tree features based on options.
 * Returns a stable array of features for use with headless-tree.
 */
export const useTreeFeatures = (
  options: UseTreeFeaturesOptions = {},
): FeatureImplementation<unknown>[] => {
  const {
    enableRenaming = true,
    enableCheckboxes = false,
    enableDragAndDrop = false,
  } = options;

  return useMemo(() => {
    const features: FeatureImplementation<unknown>[] = [
      asyncDataLoaderFeature,
      selectionFeature,
      hotkeysCoreFeature,
    ];

    if (enableRenaming) {
      features.push(renamingFeature);
    }

    if (enableCheckboxes) {
      features.push(checkboxesFeature);
    }

    if (enableDragAndDrop) {
      features.push(dragAndDropFeature);
    }

    return features;
  }, [enableRenaming, enableCheckboxes, enableDragAndDrop]);
};
