import type { FC } from 'react';
import { useCallback } from 'react';

import { useRouter } from 'next/router';

import type { IPageForTreeItem } from '~/interfaces/page';

import styles from './SimplifiedItemsTree.module.scss';


type Props = {
  item: IPageForTreeItem;
  isSelected: boolean;
};

export const SimplifiedTreeItem: FC<Props> = ({ item, isSelected }) => {
  const router = useRouter();

  const handleClick = useCallback(() => {
    router.push(item.path);
  }, [router, item.path]);

  return (
    <div
      className={styles['simplified-tree-item']}
      onClick={handleClick}
      aria-current={isSelected ? 'page' : undefined}
      role="button"
      tabIndex={0}
    >
      <span className={styles['item-path']}>{item.path}</span>
    </div>
  );
};
