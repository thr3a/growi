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
   * This renders the CreateInput with proper indentation for child level
   */
  CreateAlternativeComponent: FC<TreeItemToolProps>;

  /**
   * @deprecated Use CreateAlternativeComponent instead
   * CreateInput component to use as HeadOfChildrenComponent
   */
  CreateInputComponent: FC<TreeItemToolProps>;
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

  // CreateInput as alternative component for TreeItemLayout
  // This renders inside the TreeItemLayout, replacing the normal content
  // The item here is the placeholder node, so we need to get parent from it
  const CreateAlternativeComponent: FC<TreeItemToolProps> = useMemo(() => {
    const Component: FC<TreeItemToolProps> = ({ item }) => {
      // Get the parent item (the placeholder's parent is the actual parent where we create)
      const parentItem = item.getParent();

      const handleCreate = async (value: string) => {
        if (parentItem == null) {
          cancelCreating();
          return;
        }
        await create(parentItem, value);
      };

      const handleCancel = () => {
        cancelCreating();
      };

      return (
        <CreateInput
          validateName={validateName}
          onSubmit={handleCreate}
          onCancel={handleCancel}
          className="flex-grow-1"
        />
      );
    };
    return Component;
  }, [create, cancelCreating, validateName]);

  // Legacy: CreateInput as HeadOfChildrenComponent (with custom padding)
  const CreateInputComponent: FC<TreeItemToolProps> = useMemo(() => {
    const Component: FC<TreeItemToolProps> = ({ item }) => {
      const handleCreate = async (value: string) => {
        await create(item, value);
      };

      const handleCancel = () => {
        cancelCreating();
      };

      // Calculate indent based on item level (child should be indented one level more than parent)
      const parentLevel = item.getItemMeta().level;
      const childLevel = parentLevel + 1;
      const indentSize = 10; // px, same as TreeItemLayout

      return (
        <CreateInput
          validateName={validateName}
          onSubmit={handleCreate}
          onCancel={handleCancel}
          style={{ paddingLeft: `${childLevel * indentSize}px` }}
        />
      );
    };
    return Component;
  }, [create, cancelCreating, validateName]);

  return {
    create,
    validateName,
    startCreating,
    cancelCreating,
    isCreatingChild,
    CreateAlternativeComponent,
    CreateInputComponent,
  };
};
