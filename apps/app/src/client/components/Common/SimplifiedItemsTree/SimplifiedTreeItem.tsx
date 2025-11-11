import type { FC } from 'react';
import { useCallback } from 'react';

import { useRouter } from 'next/router';

import type { IPageForTreeItem } from '~/interfaces/page';

import { CountBadgeForPageTreeItem } from '../../Sidebar/PageTreeItem/CountBadgeForPageTreeItem';
import { usePageItemControl } from '../../Sidebar/PageTreeItem/use-page-item-control';
import { TreeItemLayout } from '../../TreeItem';


type Props = {
  item: IPageForTreeItem;
  isSelected: boolean;
  level: number;
  isExpanded: boolean;
  isFolder: boolean;
  targetPath: string;
  targetPathOrId?: string | null;
  isWipPageShown?: boolean;
  isEnableActions?: boolean;
  isReadOnlyUser?: boolean;
  onToggle: () => void;
};

export const SimplifiedTreeItem: FC<Props> = ({
  item,
  level,
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
      item={item}
      itemLevel={level}
      targetPath={targetPath}
      targetPathOrId={targetPathOrId ?? undefined}
      isOpen={isExpanded}
      isWipPageShown={isWipPageShown}
      isEnableActions={isEnableActions}
      isReadOnlyUser={isReadOnlyUser}
      onClick={handleClick}
      onWheelClick={handleWheelClick}
      onToggleOpen={onToggle}
      customEndComponents={[CountBadgeForPageTreeItem]}
      customHoveredEndComponents={[Control]}
    />
  );
};
