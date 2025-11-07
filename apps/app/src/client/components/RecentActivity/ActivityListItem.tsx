import { formatDistanceToNow } from 'date-fns';

import type { ActivityHasUserId, SupportedActivityActionType } from '~/interfaces/activity';
import { ActivityLogActions } from '~/interfaces/activity';

export const ActivityActionTranslationMap: Record<
  SupportedActivityActionType,
  string
> = {
  [ActivityLogActions.ACTION_PAGE_CREATE]: 'created a page',
  [ActivityLogActions.ACTION_PAGE_UPDATE]: 'updated a page',
  [ActivityLogActions.ACTION_PAGE_DELETE]: 'deleted a page',
  [ActivityLogActions.ACTION_PAGE_DELETE_COMPLETELY]: 'deleted a page',
  [ActivityLogActions.ACTION_PAGE_RENAME]: 'renamed a page',
  [ActivityLogActions.ACTION_PAGE_REVERT]: 'reverted a page',
  [ActivityLogActions.ACTION_PAGE_DUPLICATE]: 'duplicated a page',
  [ActivityLogActions.ACTION_PAGE_LIKE]: 'liked a page',
  [ActivityLogActions.ACTION_COMMENT_CREATE]: 'posted a comment',
};

export const IconActivityTranslationMap: Record<
  SupportedActivityActionType,
  string
> = {
  [ActivityLogActions.ACTION_PAGE_CREATE]: 'add_box',
  [ActivityLogActions.ACTION_PAGE_UPDATE]: 'edit',
  [ActivityLogActions.ACTION_PAGE_DELETE]: 'delete',
  [ActivityLogActions.ACTION_PAGE_DELETE_COMPLETELY]: 'delete_forever',
  [ActivityLogActions.ACTION_PAGE_RENAME]: 'label',
  [ActivityLogActions.ACTION_PAGE_REVERT]: 'undo',
  [ActivityLogActions.ACTION_PAGE_DUPLICATE]: 'content_copy',
  [ActivityLogActions.ACTION_PAGE_LIKE]: 'favorite',
  [ActivityLogActions.ACTION_COMMENT_CREATE]: 'comment',
};

const translateAction = (action: SupportedActivityActionType): string => {
  return ActivityActionTranslationMap[action] || 'performed an unknown action';
};

const setIcon = (action: SupportedActivityActionType): string => {
  return IconActivityTranslationMap[action] || 'question_mark';
};

const calculateTimePassed = (date: Date): string => {
  const timePassed = formatDistanceToNow(date, { addSuffix: true });

  return timePassed;
};


export const ActivityListItem = ({ activity }: { activity: ActivityHasUserId }): JSX.Element => {
  const action = activity.action as SupportedActivityActionType;

  return (
    <div className="activity-row">
      <p className="mb-1">
        <span className="material-symbols-outlined me-2">{setIcon(action)}</span>

        <span className="dark:text-white">
          {' '}{translateAction(action)}
        </span>

        <span className="text-secondary small ms-3">
          {calculateTimePassed(activity.createdAt)}
        </span>
      </p>
    </div>
  );
};
