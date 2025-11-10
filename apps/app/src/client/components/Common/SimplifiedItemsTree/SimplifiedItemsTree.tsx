import type { FC } from 'react';
import { useMemo } from 'react';

import type { IPageForTreeItem } from '~/interfaces/page';

import { SimplifiedTreeItem } from './SimplifiedTreeItem';

import styles from './SimplifiedItemsTree.module.scss';


type Props = {
  targetPathOrId?: string | null;
};

// Mock data for M1 - will be replaced with real API in M2
const MOCK_DATA: IPageForTreeItem[] = [
  {
    _id: '1',
    path: '/page1',
    parent: '/',
    descendantCount: 0,
    revision: 'rev1',
    grant: 1,
    isEmpty: false,
    wip: false,
  },
  {
    _id: '2',
    path: '/page2',
    parent: '/',
    descendantCount: 0,
    revision: 'rev2',
    grant: 1,
    isEmpty: false,
    wip: false,
  },
  {
    _id: '3',
    path: '/page3',
    parent: '/',
    descendantCount: 0,
    revision: 'rev3',
    grant: 1,
    isEmpty: false,
    wip: false,
  },
];

export const SimplifiedItemsTree: FC<Props> = ({ targetPathOrId }) => {
  const items = useMemo(() => MOCK_DATA, []);

  return (
    <div className={styles['simplified-items-tree']}>
      {items.map((item) => {
        const isSelected = targetPathOrId === item._id || targetPathOrId === item.path;
        return (
          <SimplifiedTreeItem
            key={item._id}
            item={item}
            isSelected={isSelected}
          />
        );
      })}
    </div>
  );
};
