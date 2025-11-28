import type { FC } from 'react';
import { useCallback, useMemo } from 'react';
import { Origin } from '@growi/core';
import { pagePathUtils, pathUtils } from '@growi/core/dist/utils';
import type { ItemInstance } from '@headless-tree/core';
import { useTranslation } from 'next-i18next';
import { join } from 'pathe';

import { useCreatePage } from '~/client/services/create-page';
import { toastError, toastSuccess, toastWarning } from '~/client/util/toastr';
import type { InputValidationResult } from '~/client/util/use-input-validator';
import {
  useInputValidator,
  ValidationTarget,
} from '~/client/util/use-input-validator';
import type { IPageForItem } from '~/interfaces/page';
import { mutatePageTree, mutateRecentlyUpdated } from '~/stores/page-listing';
import { shouldCreateWipPage } from '~/utils/should-create-wip-page';

import { CreateInput } from '../components/CreateInput';
import type { TreeItemToolProps } from '../interfaces';
import {
  CREATING_PAGE_VIRTUAL_ID,
  useCreatingParentId,
  usePageTreeCreateActions,
} from '../states/page-tree-create';
import { usePageTreeInformationUpdate } from '../states/page-tree-update';

type CreateResult = {
  success: boolean;
  path?: string;
  error?: Error;
};

type UsePageCreateReturn = {
  /**
   * Create a new page under the specified parent
   */
  create: (
    parentItem: ItemInstance<IPageForItem>,
    pageName: string,
  ) => Promise<CreateResult>;

  /**
   * Create a new page from the placeholder node (called by onRename handler)
   * The placeholder node's parent is used as the parent of the new page
   */
  createFromPlaceholder: (
    placeholderItem: ItemInstance<IPageForItem>,
    pageName: string,
  ) => Promise<CreateResult>;

  /**
   * Check if an item is the creating placeholder node
   */
  isCreatingPlaceholder: (item: ItemInstance<IPageForItem>) => boolean;

  /**
   * Validate page name
   */
  validateName: (name: string) => InputValidationResult | null;

  /**
   * Start creating a new page under the specified parent
   */
  startCreating: (parentItem: ItemInstance<IPageForItem>) => void;

  /**
   * Cancel page creation
   */
  cancelCreating: () => void;

  /**
   * Check if a child is being created under this item
   */
  isCreatingChild: (item: ItemInstance<IPageForItem>) => boolean;

  /**
   * Alternative component for creating a child page (used in TreeItemLayout)
   * This renders the CreateInput using item.getRenameInputProps()
   */
  CreateAlternativeComponent: FC<TreeItemToolProps>;
};

/**
 * Hook for page creation logic in tree
 * Uses Jotai atom to manage creating state
 */
export const usePageCreate = (): UsePageCreateReturn => {
  const { t } = useTranslation();
  const { create: createPage } = useCreatePage();
  const inputValidator = useInputValidator(ValidationTarget.PAGE);
  const { notifyUpdateItems } = usePageTreeInformationUpdate();
  const creatingParentId = useCreatingParentId();
  const {
    startCreating: startCreatingAction,
    cancelCreating: cancelCreatingAction,
  } = usePageTreeCreateActions();

  const validateName = useCallback(
    (name: string): InputValidationResult | null => {
      const result = inputValidator(name);
      return result ?? null;
    },
    [inputValidator],
  );

  // Wrapped cancelCreating that also notifies tree to remove placeholder
  const cancelCreating = useCallback(() => {
    const parentIdToUpdate = creatingParentId;
    cancelCreatingAction();

    // Notify tree to reload children (which will remove the placeholder)
    if (parentIdToUpdate != null) {
      notifyUpdateItems([parentIdToUpdate]);
    }
  }, [cancelCreatingAction, creatingParentId, notifyUpdateItems]);

  const startCreating = useCallback(
    (parentItem: ItemInstance<IPageForItem>) => {
      const parentId = parentItem.getId();
      const parentPath = parentItem.getItemData().path ?? '/';

      // Set creating state - expansion will be handled by SimplifiedItemsTree
      startCreatingAction(parentId, parentPath);
    },
    [startCreatingAction],
  );

  const isCreatingChild = useCallback(
    (item: ItemInstance<IPageForItem>): boolean => {
      return creatingParentId === item.getId();
    },
    [creatingParentId],
  );

  const isCreatingPlaceholder = useCallback(
    (item: ItemInstance<IPageForItem>): boolean => {
      return item.getId() === CREATING_PAGE_VIRTUAL_ID;
    },
    [],
  );

  const create = useCallback(
    async (
      parentItem: ItemInstance<IPageForItem>,
      pageName: string,
    ): Promise<CreateResult> => {
      const parentPage = parentItem.getItemData();
      const parentPath = parentPage.path ?? '/';

      // Trim and validate - empty input means cancel
      const trimmedName = pageName.trim();
      if (trimmedName === '') {
        cancelCreating();
        return { success: false };
      }

      // Build new page path
      const newPagePath = join(
        pathUtils.addTrailingSlash(parentPath),
        trimmedName,
      );

      // Check if page path is creatable
      const isCreatable = pagePathUtils.isCreatablePage(newPagePath);
      if (!isCreatable) {
        toastWarning(t('you_can_not_create_page_with_this_name_or_hierarchy'));
        return { success: false };
      }

      // Cancel creating mode first (removes placeholder)
      cancelCreating();

      try {
        await createPage(
          {
            path: newPagePath,
            parentPath,
            body: undefined,
            // keep grant info undefined to inherit from parent
            grant: undefined,
            grantUserGroupIds: undefined,
            origin: Origin.View,
            wip: shouldCreateWipPage(newPagePath),
          },
          {
            skipTransition: true,
            onCreated: () => {
              mutatePageTree();
              mutateRecentlyUpdated();

              // Notify headless-tree to update parent's children
              const parentId = parentItem.getId();
              notifyUpdateItems([parentId]);

              toastSuccess(t('successfully_saved_the_page'));
            },
          },
        );

        return { success: true, path: newPagePath };
      } catch (err) {
        toastError(err);
        return { success: false, error: err as Error };
      }
    },
    [t, createPage, notifyUpdateItems, cancelCreating],
  );

  // Create from placeholder node (used by onRename handler in SimplifiedItemsTree)
  const createFromPlaceholder = useCallback(
    async (
      placeholderItem: ItemInstance<IPageForItem>,
      pageName: string,
    ): Promise<CreateResult> => {
      const parentItem = placeholderItem.getParent();
      if (parentItem == null) {
        cancelCreating();
        return { success: false };
      }
      return create(parentItem, pageName);
    },
    [create, cancelCreating],
  );

  // CreateInput as alternative component for TreeItemLayout
  // This uses item.getRenameInputProps() from headless-tree's renamingFeature
  // Note: SimplifiedPageTreeItem ensures item.isRenaming() is true before rendering this
  const CreateAlternativeComponent: FC<TreeItemToolProps> = useMemo(() => {
    const Component: FC<TreeItemToolProps> = ({ item }) => (
      <CreateInput
        inputProps={item.getRenameInputProps()}
        validateName={validateName}
        className="flex-grow-1"
      />
    );
    return Component;
  }, [validateName]);

  return {
    create,
    createFromPlaceholder,
    isCreatingPlaceholder,
    validateName,
    startCreating,
    cancelCreating,
    isCreatingChild,
    CreateAlternativeComponent,
  };
};
