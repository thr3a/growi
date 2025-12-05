import { useMemo } from 'react';
import type { FeatureImplementation } from '@headless-tree/core';
import {
  asyncDataLoaderFeature,
  checkboxesFeature,
  hotkeysCoreFeature,
  renamingFeature,
  selectionFeature,
} from '@headless-tree/core';

export type UseTreeFeaturesOptions = {
  enableRenaming?: boolean;
  enableCheckboxes?: boolean;
};

/**
 * Hook to configure tree features based on options.
 * Returns a stable array of features for use with headless-tree.
 */
export const useTreeFeatures = (
  options: UseTreeFeaturesOptions = {},
): FeatureImplementation<unknown>[] => {
  const { enableRenaming = true, enableCheckboxes = false } = options;

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

    return features;
  }, [enableRenaming, enableCheckboxes]);
};
