import {
  type RefObject, useCallback,
  useLayoutEffect,
} from 'react';

import { useSWRStatic } from '@growi/core/dist/swr';
import { pagePathUtils } from '@growi/core/dist/utils';
import { useRouter } from 'next/router';
import type { HtmlElementNode } from 'rehype-toc';
import {
  type SWRResponse,
} from 'swr';
import useSWRImmutable from 'swr/immutable';

import type { UpdateDescCountData } from '~/interfaces/websocket';
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

import { useStaticSWR } from './use-static-swr';

const { isTrashTopPage, isUsersTopPage } = pagePathUtils;

const logger = loggerFactory('growi:stores:ui');


/** **********************************************************
 *                     Storing objects to ref
 *********************************************************** */

export const useCurrentPageTocNode = (): SWRResponse<HtmlElementNode, any> => {
  const currentPagePath = useCurrentPagePath();

  return useStaticSWR(['currentPageTocNode', currentPagePath]);
};

/** **********************************************************
 *                          SWR Hooks
 *                      for switching UI
 *********************************************************** */

export const useSidebarScrollerRef = (initialData?: RefObject<HTMLDivElement | null>): SWRResponse<RefObject<HTMLDivElement | null>, Error> => {
  return useSWRStatic<RefObject<HTMLDivElement | null>, Error>('sidebarScrollerRef', initialData);
};

type PageTreeDescCountMapUtils = {
  update(newData?: UpdateDescCountData): Promise<UpdateDescCountData | undefined>
  getDescCount(pageId?: string): number | null | undefined
}

export const usePageTreeDescCountMap = (initialData?: UpdateDescCountData): SWRResponse<UpdateDescCountData, Error> & PageTreeDescCountMapUtils => {
  const key = 'pageTreeDescCountMap';

  const swrResponse = useStaticSWR<UpdateDescCountData, Error>(key, initialData, { fallbackData: new Map() });

  return {
    ...swrResponse,
    getDescCount: (pageId?: string) => (pageId != null ? swrResponse.data?.get(pageId) : null),
    update: (newData: UpdateDescCountData) => swrResponse.mutate(new Map([...(swrResponse.data || new Map()), ...newData])),
  };
};


type UseCommentEditorDirtyMapOperation = {
  evaluate(key: string, commentBody: string): Promise<number>,
  clean(key: string): Promise<number>,
}

export const useCommentEditorDirtyMap = (): SWRResponse<Map<string, boolean>, Error> & UseCommentEditorDirtyMapOperation => {
  const router = useRouter();

  const swrResponse = useSWRStatic<Map<string, boolean>, Error>('editingCommentsNum', undefined, { fallbackData: new Map() });

  const { mutate } = swrResponse;

  const evaluate = useCallback(async (key: string, commentBody: string) => {
    const newMap = await mutate((map) => {
      if (map == null) return new Map();

      if (commentBody.length === 0) {
        map.delete(key);
      }
      else {
        map.set(key, true);
      }

      return map;
    });
    return newMap?.size ?? 0;
  }, [mutate]);
  const clean = useCallback(async (key: string) => {
    const newMap = await mutate((map) => {
      if (map == null) return new Map();
      map.delete(key);
      return map;
    });
    return newMap?.size ?? 0;
  }, [mutate]);

  const reset = useCallback(() => mutate(new Map()), [mutate]);

  useLayoutEffect(() => {
    router.events.on('routeChangeComplete', reset);
    return () => {
      router.events.off('routeChangeComplete', reset);
    };
  }, [reset, router.events]);

  return {
    ...swrResponse,
    evaluate,
    clean,
  };
};


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

export const useIsUntitledPage = (): SWRResponse<boolean> => {
  const key = 'isUntitledPage';

  const pageId = useCurrentPageId();

  return useSWRStatic(
    pageId == null ? null : [key, pageId],
    undefined,
    { fallbackData: false },
  );

};
