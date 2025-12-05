import type { FC } from 'react';

import type { TreeItemProps } from '~/features/page-tree';
import { SimpleItemContent } from '~/features/page-tree/components';

import styles from './AiAssistantManagementPageTreeSelection.module.scss';

// Reuse the module class from the parent component
const checkboxClass = styles['tree-item-checkbox'] ?? '';

export const simplifiedTreeItemWithCheckboxSize = 36; // in px

type SimplifiedTreeItemWithCheckboxProps = TreeItemProps & {
  key?: React.Key | null;
};

const indentSize = 10; // in px

export const SimplifiedTreeItemWithCheckbox: FC<
  SimplifiedTreeItemWithCheckboxProps
> = (props) => {
  const { item, onToggle } = props;

  const page = item.getItemData();
  const itemLevel = item.getItemMeta().level;
  const hasDescendants = item.isFolder();

  // Get checkbox props from headless-tree
  const checkboxProps = (item as any).getCheckboxProps?.() ?? {};

  const handleToggleExpand = () => {
    if (item.isExpanded()) {
      item.collapse();
    } else {
      item.expand();
    }
    onToggle?.();
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    (item as any).toggleCheckedState?.();
    onToggle?.();
  };

  return (
    <div
      className="tree-item-layout text-muted"
      style={{ paddingLeft: `${itemLevel > 0 ? indentSize * itemLevel : 0}px` }}
    >
      <li className="list-group-item list-group-item-action border-0 py-0 ps-0 d-flex align-items-center rounded-1">
        <div
          className="btn-triangle-container d-flex justify-content-center"
          style={{ minWidth: '24px' }}
        >
          {hasDescendants && (
            <button
              type="button"
              className={`btn p-0 ${item.isExpanded() ? 'open' : ''}`}
              onClick={handleToggleExpand}
              style={{
                border: 0,
                transition: 'all 0.2s ease-out',
                transform: item.isExpanded() ? 'rotate(90deg)' : 'rotate(0deg)',
              }}
            >
              <span className="material-symbols-outlined fs-5">
                arrow_right
              </span>
            </button>
          )}
        </div>

        <SimpleItemContent page={page} />

        <input
          type="checkbox"
          className={`form-check-input ${checkboxClass}`}
          checked={checkboxProps.checked ?? false}
          onChange={handleCheckboxChange}
        />
      </li>
    </div>
  );
};
