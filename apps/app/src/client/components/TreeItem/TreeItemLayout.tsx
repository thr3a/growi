import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
  type JSX,
} from 'react';

import { addTrailingSlash } from '@growi/core/dist/utils/path-utils';

import { usePageTreeDescCountMap } from '~/states/ui/page-tree-desc-count-map';

import { SimpleItemContent } from './SimpleItemContent';
import type { TreeItemProps, TreeItemToolProps } from './interfaces';


import styles from './TreeItemLayout.module.scss';

const moduleClass = styles['tree-item-layout'] ?? '';


type TreeItemLayoutProps = TreeItemProps & {
  className?: string,
  indentSize?: number,
}

export const TreeItemLayout = (props: TreeItemLayoutProps): JSX.Element => {
  const {
    className, itemClassName,
    indentSize = 10,
    item,
    targetPath, targetPathOrId,
    isEnableActions, isReadOnlyUser, isWipPageShown = true,
    showAlternativeContent,
    onRenamed, onClick, onClickDuplicateMenuItem, onClickDeleteMenuItem, onWheelClick,
    onToggle,
  } = props;

  const page = item.getItemData();
  const itemLevel = item.getItemMeta().level;

  const [isAutoOpenerInitialized, setAutoOpenerInitialized] = useState(false);

  const toggleHandler = useCallback(() => {
    if (item.isExpanded()) {
      item.collapse();
    }
    else {
      item.expand();
    }

    onToggle?.();
  }, [item, onToggle]);

  const itemClickHandler = useCallback((e: MouseEvent) => {
    // DO NOT handle the event when e.currentTarget and e.target is different
    if (e.target !== e.currentTarget) {
      return;
    }

    onClick?.(page);

  }, [onClick, page]);

  const itemMouseupHandler = useCallback((e: MouseEvent) => {
    // DO NOT handle the event when e.currentTarget and e.target is different
    if (e.target !== e.currentTarget) {
      return;
    }

    if (e.button === 1) {
      e.preventDefault();
      onWheelClick?.(page);
    }

  }, [onWheelClick, page]);


  // descendantCount
  const { getDescCount } = usePageTreeDescCountMap();
  const descendantCount = getDescCount(page._id) || page.descendantCount || 0;

  // hasDescendants flag
  const hasDescendants = descendantCount > 0;

  // auto open if targetPath is descendant of this page
  useEffect(() => {
    if (!isAutoOpenerInitialized) {
      const isPathToTarget = page.path != null
        && targetPath.startsWith(addTrailingSlash(page.path))
        && targetPath !== page.path; // Target Page does not need to be opened

      if (isPathToTarget) {
        item.expand();
        onToggle?.();
      }
    }

    setAutoOpenerInitialized(true);

  }, [targetPath, page.path, isAutoOpenerInitialized, item, onToggle]);

  const isSelected = useMemo(() => {
    return page._id === targetPathOrId || page.path === targetPathOrId;
  }, [page, targetPathOrId]);

  const toolProps: TreeItemToolProps = {
    item,
    isEnableActions,
    isReadOnlyUser,
    onRenamed,
    onClickDuplicateMenuItem,
    onClickDeleteMenuItem,
  };

  const EndComponents = props.customEndComponents;
  const HoveredEndComponents = props.customHoveredEndComponents;
  const AlternativeComponents = props.customAlternativeComponents;

  if (!isWipPageShown && page.wip) {
    return <></>;
  }

  return (
    <div
      id={`tree-item-layout-${page._id}`}
      data-testid="grw-pagetree-item-container"
      className={`${moduleClass} ${className} level-${itemLevel}`}
      style={{ paddingLeft: `${itemLevel > 1 ? indentSize : 0}px` }}
    >
      <li
        role="button"
        className={`list-group-item list-group-item-action
          ${isSelected ? 'active' : ''}
          ${itemClassName ?? ''}
          border-0 py-0 ps-0 d-flex align-items-center rounded-1`}
        id={`grw-pagetree-list-${page._id}`}
        onClick={itemClickHandler}
        onMouseUp={itemMouseupHandler}
      >

        <div className="btn-triangle-container d-flex justify-content-center">
          {hasDescendants && (
            <button
              type="button"
              className={`btn btn-triangle p-0 ${item.isExpanded() ? 'open' : ''}`}
              onClick={toggleHandler}
            >
              <div className="d-flex justify-content-center">
                <span className="material-symbols-outlined fs-5">arrow_right</span>
              </div>
            </button>
          )}
        </div>

        {showAlternativeContent && AlternativeComponents != null
          ? (
            AlternativeComponents.map((AlternativeContent, index) => (
              // eslint-disable-next-line react/no-array-index-key
              (<AlternativeContent key={index} {...toolProps} />)
            ))
          )
          : (
            <>
              <SimpleItemContent page={page} />
              <div className="d-hover-none">
                {EndComponents?.map((EndComponent, index) => (
                  // eslint-disable-next-line react/no-array-index-key
                  (<EndComponent key={index} {...toolProps} />)
                ))}
              </div>
              <div className="d-none d-hover-flex">
                {HoveredEndComponents?.map((HoveredEndContent, index) => (
                  // eslint-disable-next-line react/no-array-index-key
                  (<HoveredEndContent key={index} {...toolProps} />)
                ))}
              </div>
            </>
          )
        }

      </li>
    </div>
  );
};
