import { useEffect, useRef } from 'react';
import type { ItemInstance } from '@headless-tree/core';

import type { IPageForItem } from '~/interfaces/page';

import { CREATING_PAGE_VIRTUAL_ID } from '../constants/_inner';

type UsePlaceholderRenameEffectParams = {
  item: ItemInstance<IPageForItem>;
  onCancelCreate: () => void;
};

/**
 * Hook that manages the renaming mode for placeholder nodes.
 *
 * When a placeholder node is rendered:
 * 1. Automatically starts renaming mode to enable the input field
 * 2. Tracks when renaming mode becomes active
 * 3. Detects when renaming mode ends (Esc key) and calls onCancelCreate
 *
 * This hook separates the placeholder renaming behavior from the component,
 * keeping the component focused on rendering.
 */
export const usePlaceholderRenameEffect = ({
  item,
  onCancelCreate,
}: UsePlaceholderRenameEffectParams): void => {
  // Check if this is the creating placeholder node
  const isPlaceholder = item.getItemData()._id === CREATING_PAGE_VIRTUAL_ID;

  // Track if renaming mode was ever activated for this placeholder
  const wasRenamingRef = useRef(false);
  const isRenamingNow = item.isRenaming();

  // Start renaming mode on placeholder node to enable getRenameInputProps()
  useEffect(() => {
    if (isPlaceholder && !item.isRenaming()) {
      item.startRenaming();
    }
  }, [isPlaceholder, item]);

  // Track when renaming becomes active
  useEffect(() => {
    if (isPlaceholder && isRenamingNow) {
      wasRenamingRef.current = true;
    }
  }, [isPlaceholder, isRenamingNow]);

  // Cancel creating when renaming mode ends on placeholder node (Esc key pressed)
  useEffect(() => {
    // Only cancel if renaming was previously active and is now inactive
    if (isPlaceholder && wasRenamingRef.current && !isRenamingNow) {
      onCancelCreate();
      wasRenamingRef.current = false;
    }
  }, [isPlaceholder, isRenamingNow, onCancelCreate]);
};
