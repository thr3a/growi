import type { FC } from 'react';
import { useCallback } from 'react';

import { pagePathUtils, pathUtils } from '@growi/core/dist/utils';
import { useRouter } from 'next/router';

import type { IPageForItem } from '~/interfaces/page';

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
  const { Control } = usePageItemControl();

  const handleClick = useCallback(() => {
    if (item.path == null || item._id == null) return;
    router.push(item.path);
  }, [router, item.path, item._id]);

  const handleWheelClick = useCallback(() => {
    if (item.path == null || item._id == null) return;
    window.open(item.path, '_blank');
  }, [item.path, item._id]);

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
      onClick={handleClick}
      onWheelClick={handleWheelClick}
      onToggle={onToggle}
      customEndComponents={[CountBadgeForPageTreeItem]}
      customHoveredEndComponents={[Control]}
    />
  );
};
