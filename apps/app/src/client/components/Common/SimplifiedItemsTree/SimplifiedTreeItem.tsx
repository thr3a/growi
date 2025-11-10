import type { FC } from 'react';
import { useCallback } from 'react';

import { useRouter } from 'next/router';

import type { IPageForTreeItem } from '~/interfaces/page';

import styles from './SimplifiedItemsTree.module.scss';


type Props = {
  item: IPageForTreeItem;
  isSelected: boolean;
  level: number;
  isExpanded: boolean;
  isFolder: boolean;
  onToggle: () => void;
};

export const SimplifiedTreeItem: FC<Props> = ({
  item,
  isSelected,
  level,
  isExpanded,
  isFolder,
  onToggle,
}) => {
  const router = useRouter();

  const handleClick = useCallback(() => {
    router.push(item.path);
  }, [router, item.path]);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle();
  }, [onToggle]);

  return (
    <div
      className={styles['simplified-tree-item']}
      onClick={handleClick}
      aria-current={isSelected ? 'page' : undefined}
      role="button"
      tabIndex={0}
      style={{ paddingLeft: `${level * 20}px` }}
    >
      {isFolder && (
        <span
          className={styles['toggle-icon']}
          onClick={handleToggle}
        >
          {isExpanded ? '▼' : '▶'}
        </span>
      )}
      <span className={styles['item-path']}>{item.path}</span>
    </div>
  );
};
