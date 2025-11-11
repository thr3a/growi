import type { FC } from 'react';
import { useCallback } from 'react';

import type { IPageToDeleteWithMeta } from '@growi/core';
import { pathUtils } from '@growi/core/dist/utils';
import { useRouter } from 'next/router';

import type { IPageForItem } from '~/interfaces/page';
import { usePageDeleteModalActions } from '~/states/ui/modal/page-delete';
import type { IPageForPageDuplicateModal } from '~/states/ui/modal/page-duplicate';
import { usePageDuplicateModalActions } from '~/states/ui/modal/page-duplicate';
import { mutatePageTree, mutateRecentlyUpdated } from '~/stores/page-listing';

import type { TreeItemProps } from '../../TreeItem';
import { TreeItemLayout } from '../../TreeItem';

import { CountBadgeForPageTreeItem } from './CountBadgeForPageTreeItem';
import { usePageItemControl } from './use-page-item-control';

import styles from './PageTreeItem.module.scss';

const moduleClass = styles['page-tree-item'] ?? '';


export const simplifiedPageTreeItemSize = 40; // in px


export const SimplifiedPageTreeItem: FC<TreeItemProps> = ({
  item,
  itemLevel,
  isExpanded,
  targetPath,
  targetPathOrId,
  isWipPageShown,
  isEnableActions = false,
  isReadOnlyUser = false,
  onToggle,
}) => {
  const router = useRouter();

  const { open: openDuplicateModal } = usePageDuplicateModalActions();
  const { open: openDeleteModal } = usePageDeleteModalActions();

  const onClickDuplicateMenuItem = useCallback((page: IPageForPageDuplicateModal) => {
    openDuplicateModal(page, {
      onDuplicated: () => {
        mutatePageTree();
        mutateRecentlyUpdated();
      },
    });
  }, [openDuplicateModal]);

  const onClickDeleteMenuItem = useCallback((page: IPageToDeleteWithMeta) => {
    openDeleteModal([page], {
      onDeleted: () => {
        mutatePageTree();
        mutateRecentlyUpdated();
      },
    });
  }, [openDeleteModal]);

  const { Control } = usePageItemControl();

  const itemSelectedHandler = useCallback((page: IPageForItem) => {
    if (page.path == null || page._id == null) return;

    const link = pathUtils.returnPathForURL(page.path, page._id);
    router.push(link);
  }, [router]);

  const itemSelectedByWheelClickHandler = useCallback((page: IPageForItem) => {
    if (page.path == null || page._id == null) return;

    const url = pathUtils.returnPathForURL(page.path, page._id);
    window.open(url, '_blank');
  }, []);

  return (
    <TreeItemLayout
      className={moduleClass}
      item={item}
      itemLevel={itemLevel}
      targetPath={targetPath}
      targetPathOrId={targetPathOrId ?? undefined}
      isExpanded={isExpanded}
      isWipPageShown={isWipPageShown}
      isEnableActions={isEnableActions}
      isReadOnlyUser={isReadOnlyUser}
      onClick={itemSelectedHandler}
      onWheelClick={itemSelectedByWheelClickHandler}
      onToggle={onToggle}
      onClickDuplicateMenuItem={onClickDuplicateMenuItem}
      onClickDeleteMenuItem={onClickDeleteMenuItem}
      customEndComponents={[CountBadgeForPageTreeItem]}
      customHoveredEndComponents={[Control]}
    />
  );
};
