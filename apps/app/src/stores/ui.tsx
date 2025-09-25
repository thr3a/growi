import { pagePathUtils } from '@growi/core/dist/utils';
import {
  type SWRResponse,
} from 'swr';
import useSWRImmutable from 'swr/immutable';

import {
  useIsReadOnlyUser, useIsSharedUser,
} from '~/states/context';
import { useCurrentUser } from '~/states/global';
import {
  useIsEditable, useIsIdenticalPath, usePageNotFound, useCurrentPagePath, useIsTrashPage, useCurrentPageId,
} from '~/states/page';
import { useShareLinkId } from '~/states/page/hooks';
import { EditorMode, useEditorMode } from '~/states/ui/editor';
import loggerFactory from '~/utils/logger';

const { isTrashTopPage, isUsersTopPage } = pagePathUtils;

const logger = loggerFactory('growi:stores:ui');


/** **********************************************************
 *                          SWR Hooks
 *                Determined value by context
 *********************************************************** */

export const useIsAbleToShowTrashPageManagementButtons = (): SWRResponse<boolean, Error> => {
  const key = 'isAbleToShowTrashPageManagementButtons';

  const _currentUser = useCurrentUser();
  const isCurrentUserExist = _currentUser != null;

  const _currentPageId = useCurrentPageId();
  const _isNotFound = usePageNotFound();
  const _isTrashPage = useIsTrashPage();
  const _isReadOnlyUser = useIsReadOnlyUser();
  const isPageExist = _currentPageId != null && _isNotFound === false;
  const isTrashPage = isPageExist && _isTrashPage === true;
  const isReadOnlyUser = isPageExist && _isReadOnlyUser === true;

  const includesUndefined = [_currentUser, _currentPageId, _isNotFound, _isReadOnlyUser, _isTrashPage].some(v => v === undefined);

  return useSWRImmutable(
    includesUndefined ? null : [key, isTrashPage, isCurrentUserExist, isReadOnlyUser],
    ([, isTrashPage, isCurrentUserExist, isReadOnlyUser]) => isTrashPage && isCurrentUserExist && !isReadOnlyUser,
  );
};

export const useIsAbleToShowPageManagement = (): SWRResponse<boolean, Error> => {
  const key = 'isAbleToShowPageManagement';
  const currentPageId = useCurrentPageId();
  const isNotFound = usePageNotFound();
  const _isTrashPage = useIsTrashPage();
  const _isSharedUser = useIsSharedUser();

  const pageId = currentPageId;
  const includesUndefined = [pageId, _isTrashPage, _isSharedUser, isNotFound].some(v => v === undefined);
  const isPageExist = (pageId != null) && isNotFound === false;
  const isEmptyPage = (pageId != null) && isNotFound === true;
  const isTrashPage = isPageExist && _isTrashPage === true;
  const isSharedUser = isPageExist && _isSharedUser === true;

  return useSWRImmutable(
    includesUndefined ? null : [key, pageId, isPageExist, isEmptyPage, isTrashPage, isSharedUser],
    ([, , isPageExist, isEmptyPage, isTrashPage, isSharedUser]) => (isPageExist && !isTrashPage && !isSharedUser) || isEmptyPage,
  );
};

export const useIsAbleToShowTagLabel = (): SWRResponse<boolean, Error> => {
  const key = 'isAbleToShowTagLabel';
  const pageId = useCurrentPageId();
  const isNotFound = usePageNotFound();
  const currentPagePath = useCurrentPagePath();
  const isIdenticalPath = useIsIdenticalPath();
  const { editorMode } = useEditorMode();
  const shareLinkId = useShareLinkId();


  const includesUndefined = [currentPagePath, isIdenticalPath, isNotFound, editorMode].some(v => v === undefined);

  const isViewMode = editorMode === EditorMode.View;

  return useSWRImmutable(
    includesUndefined ? null : [key, pageId, currentPagePath, isIdenticalPath, isNotFound, editorMode, shareLinkId],
    // "/trash" page does not exist on page collection and unable to add tags
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    () => !isUsersTopPage(currentPagePath!) && !isTrashTopPage(currentPagePath!) && shareLinkId == null && !isIdenticalPath && !(isViewMode && isNotFound),
  );
};

export const useIsAbleToChangeEditorMode = (): SWRResponse<boolean, Error> => {
  const key = 'isAbleToChangeEditorMode';
  const isEditable = useIsEditable();
  const isSharedUser = useIsSharedUser();

  const includesUndefined = [isEditable, isSharedUser].some(v => v === undefined);

  return useSWRImmutable(
    includesUndefined ? null : [key, isEditable, isSharedUser],
    () => !!isEditable && !isSharedUser,
  );
};

export const useIsAbleToShowPageAuthors = (): SWRResponse<boolean, Error> => {
  const key = 'isAbleToShowPageAuthors';
  const pageId = useCurrentPageId();
  const isNotFound = usePageNotFound();
  const pagePath = useCurrentPagePath();

  const includesUndefined = [pageId, pagePath, isNotFound].some(v => v === undefined);
  const isPageExist = (pageId != null) && !isNotFound;
  const isUsersTopPagePath = pagePath != null && isUsersTopPage(pagePath);

  return useSWRImmutable(
    includesUndefined ? null : [key, pageId, pagePath, isNotFound],
    () => isPageExist && !isUsersTopPagePath,
  );
};
