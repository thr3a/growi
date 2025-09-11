import {
  type IPagePopulatedToShowRevision,
  isIPageNotFoundInfo,
} from '@growi/core';
import { isErrorV3 } from '@growi/core/dist/models';
import { isClient } from '@growi/core/dist/utils';
import { isPermalink } from '@growi/core/dist/utils/page-path-utils';
import { removeHeadingSlash } from '@growi/core/dist/utils/path-utils';
import { useAtomValue } from 'jotai';
import { useAtomCallback } from 'jotai/utils';
import { useCallback } from 'react';

import { apiv3Get } from '~/client/util/apiv3-client';
import loggerFactory from '~/utils/logger';
import {
  currentPageDataAtom,
  currentPageIdAtom,
  isForbiddenAtom,
  pageErrorAtom,
  pageLoadingAtom,
  pageNotFoundAtom,
  shareLinkIdAtom,
} from './internal-atoms';

const logger = loggerFactory('growi:states:page:useFetchCurrentPage');

type FetchPageArgs = {
  path?: string;
  pageId?: string;
  revisionId?: string;
};

/**
 * Simplified page fetching hook using Jotai state management
 * All state is managed through atoms for consistent global state
 */
export const useFetchCurrentPage = (): {
  fetchCurrentPage: (
    args?: FetchPageArgs,
  ) => Promise<IPagePopulatedToShowRevision | null>;
  isLoading: boolean;
  error: Error | null;
} => {
  const shareLinkId = useAtomValue(shareLinkIdAtom);

  const isLoading = useAtomValue(pageLoadingAtom);
  const error = useAtomValue(pageErrorAtom);

  const fetchCurrentPage = useAtomCallback(
    useCallback(
      async (
        get,
        set,
        args?: FetchPageArgs,
      ): Promise<IPagePopulatedToShowRevision | null> => {
        const currentPageId = get(currentPageIdAtom);
        const currentPageData = get(currentPageDataAtom);

        // Process path first to handle permalinks and strip hash fragments
        let decodedPath: string | undefined;
        if (args?.path != null) {
          try {
            decodedPath = decodeURIComponent(args.path);
          } catch (e) {
            decodedPath = args.path;
          }
        }

        // Strip hash fragment from path to properly detect permalinks
        let pathWithoutHash: string | undefined;
        if (decodedPath != null) {
          try {
            const url = new URL(decodedPath, 'http://example.com');
            pathWithoutHash = url.pathname;
          } catch {
            // Fallback to simple split if URL parsing fails
            pathWithoutHash = decodedPath.split('#')[0];
          }
        }

        // Guard clause to prevent unnecessary fetching
        if (args?.pageId != null && args.pageId === currentPageId) {
          return currentPageData ?? null;
        }
        if (pathWithoutHash != null) {
          if (
            isPermalink(pathWithoutHash) &&
            removeHeadingSlash(pathWithoutHash) === currentPageId
          ) {
            return currentPageData ?? null;
          }
          if (pathWithoutHash === currentPageData?.path) {
            return currentPageData ?? null;
          }
        }

        set(pageLoadingAtom, true);
        set(pageErrorAtom, null);

        // determine parameters
        const pageId = args?.pageId;
        const revisionId =
          args?.revisionId ??
          (isClient()
            ? new URLSearchParams(window.location.search).get('revisionId')
            : undefined);

        // params for API
        const params: {
          path?: string;
          pageId?: string;
          revisionId?: string;
          shareLinkId?: string;
        } = {};
        if (shareLinkId != null) {
          params.shareLinkId = shareLinkId;
        }
        if (revisionId != null) {
          params.revisionId = revisionId;
        }

        // priority: pageId > permalink > path
        if (pageId != null) {
          params.pageId = pageId;
        } else if (pathWithoutHash != null && isPermalink(pathWithoutHash)) {
          params.pageId = removeHeadingSlash(pathWithoutHash);
        } else if (decodedPath != null) {
          params.path = decodedPath;
        }
        // if args is empty, get from global state
        else if (currentPageId != null) {
          params.pageId = currentPageId;
        } else if (isClient()) {
          try {
            params.path = decodeURIComponent(window.location.pathname);
          } catch (e) {
            params.path = window.location.pathname;
          }
        } else {
          // TODO: https://github.com/weseek/growi/pull/9118
          // throw new Error('Either path or pageId must be provided when not in a browser environment');
          set(pageLoadingAtom, false);
          return null;
        }

        try {
          const { data } = await apiv3Get<{
            page: IPagePopulatedToShowRevision;
          }>('/page', params);
          const { page: newData } = data;

          set(currentPageDataAtom, newData);
          set(currentPageIdAtom, newData._id);
          set(pageNotFoundAtom, false);

          return newData;
        } catch (err) {
          if (Array.isArray(err) && err.length > 0 && isErrorV3(err[0])) {
            const error = err[0];
            set(pageErrorAtom, error);

            if (isIPageNotFoundInfo(error.args)) {
              set(pageNotFoundAtom, true);
              set(isForbiddenAtom, error.args.isForbidden ?? false);
              set(currentPageDataAtom, undefined);
            }
          } else {
            logger.error('Unhandled error when fetching current page:', err);
          }
        } finally {
          set(pageLoadingAtom, false);
        }

        return null;
      },
      [shareLinkId],
    ),
  );

  return { fetchCurrentPage, isLoading, error };
};
