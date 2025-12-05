import type { FC } from 'react';

import type { TreeItemProps, TreeItemToolProps } from '~/features/page-tree';
import { TreeItemLayout } from '~/features/page-tree/components';

import styles from './AiAssistantManagementPageTreeSelection.module.scss';

// Reuse the module class from the parent component
const checkboxClass = styles['tree-item-checkbox'] ?? '';

export const simplifiedTreeItemWithCheckboxSize = 36; // in px

type SimplifiedTreeItemWithCheckboxProps = TreeItemProps & {
  key?: React.Key | null;
};

// Checkbox component to be used as customEndComponents
const TreeItemCheckbox: FC<TreeItemToolProps> = ({ item }) => {
  // Get checkbox props from headless-tree
  // biome-ignore lint/suspicious/noExplicitAny: checkboxesFeature adds these methods dynamically
  const checkboxProps = (item as any).getCheckboxProps?.() ?? {};

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    // biome-ignore lint/suspicious/noExplicitAny: checkboxesFeature adds these methods dynamically
    (item as any).toggleCheckedState?.();
  };

  // Prevent click events from bubbling up to the li element
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: click handler only prevents propagation
    // biome-ignore lint/a11y/noStaticElementInteractions: wrapper div to stop click propagation
    <div onClick={handleClick} className="d-flex align-items-center">
      <input
        type="checkbox"
        className={`form-check-input ${checkboxClass}`}
        checked={checkboxProps.checked ?? false}
        onChange={handleCheckboxChange}
      />
    </div>
  );
};

export const SimplifiedTreeItemWithCheckbox: FC<
  SimplifiedTreeItemWithCheckboxProps
> = (props) => {
  return (
    <TreeItemLayout
      {...props}
      className="text-muted"
      customEndComponents={[TreeItemCheckbox]}
      customHoveredEndComponents={[TreeItemCheckbox]}
    />
  );
};
