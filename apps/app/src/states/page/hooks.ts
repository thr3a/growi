import { pagePathUtils } from '@growi/core/dist/utils';
import { useAtomValue } from 'jotai';
import { useAtomCallback } from 'jotai/utils';
import { useCallback, useMemo } from 'react';
import { useIsGuestUser, useIsReadOnlyUser } from '../context';
import { useCurrentPathname } from '../global';
import {
  currentPageDataAtom,
  currentPageIdAtom,
  currentPagePathAtom,
  isForbiddenAtom,
  isIdenticalPathAtom,
  isNotCreatableAtom,
  isRevisionOutdatedAtom,
  isTrashPageAtom,
  latestRevisionAtom,
  pageNotCreatableAtom,
  pageNotFoundAtom,
  redirectFromAtom,
  remoteRevisionBodyAtom,
  remoteRevisionIdAtom,
  remoteRevisionLastUpdatedAtAtom,
  remoteRevisionLastUpdateUserAtom,
  shareLinkIdAtom,
  templateBodyAtom,
  templateTagsAtom,
} from './internal-atoms';

/**
 * Public hooks for page state management
 * These provide a clean interface while hiding internal atom implementation
 */

// Read-only hooks for page state
export const useCurrentPageId = () => useAtomValue(currentPageIdAtom);

export const useCurrentPageData = () => useAtomValue(currentPageDataAtom);

export const usePageNotFound = () => useAtomValue(pageNotFoundAtom);

export const usePageNotCreatable = () => useAtomValue(pageNotCreatableAtom);

export const useIsIdenticalPath = () => useAtomValue(isIdenticalPathAtom);

export const useIsForbidden = () => useAtomValue(isForbiddenAtom);

export const useIsNotCreatable = () => useAtomValue(isNotCreatableAtom);

export const useLatestRevision = () => useAtomValue(latestRevisionAtom);

export const useShareLinkId = () => useAtomValue(shareLinkIdAtom);

export const useTemplateTags = () => useAtomValue(templateTagsAtom);

export const useTemplateBody = () => useAtomValue(templateBodyAtom);

// Remote revision hooks (replacements for stores/remote-latest-page.ts)
export const useRemoteRevisionId = () => useAtomValue(remoteRevisionIdAtom);

export const useRemoteRevisionBody = () => useAtomValue(remoteRevisionBodyAtom);

export const useRemoteRevisionLastUpdateUser = () =>
  useAtomValue(remoteRevisionLastUpdateUserAtom);

export const useRemoteRevisionLastUpdatedAt = () =>
  useAtomValue(remoteRevisionLastUpdatedAtAtom);

export const useRedirectFrom = () => useAtomValue(redirectFromAtom);

// Enhanced computed hooks (pure Jotai - no SWR needed)

/**
 * Get current page path with fallback to pathname
 * Pure Jotai replacement for stores/page.tsx useCurrentPagePath
 */
export const useCurrentPagePath = (): string | undefined => {
  const currentPagePath = useAtomValue(currentPagePathAtom);
  const currentPathname = useCurrentPathname();

  if (currentPagePath != null) {
    return currentPagePath;
  }
  if (currentPathname != null && !pagePathUtils.isPermalink(currentPathname)) {
    return currentPathname;
  }
  return undefined;
};

/**
 * Check if current page is in trash
 * Pure Jotai replacement for stores/page.tsx useIsTrashPage
 */
export const useIsTrashPage = (): boolean => useAtomValue(isTrashPageAtom);

/**
 * Check if current revision is outdated
 * Pure Jotai replacement for stores/page.tsx useIsRevisionOutdated
 */
export const useIsRevisionOutdated = (): boolean =>
  useAtomValue(isRevisionOutdatedAtom);

/**
 * Computed hook for checking if current page is editable
 */
export const useIsEditable = () => {
  const isGuestUser = useIsGuestUser();
  const isReadOnlyUser = useIsReadOnlyUser();

  const getCombinedConditions = useAtomCallback(
    useCallback((get) => {
      const isForbidden = get(isForbiddenAtom);
      const isNotCreatable = get(isNotCreatableAtom);
      const isIdenticalPath = get(isIdenticalPathAtom);

      return !isForbidden && !isIdenticalPath && !isNotCreatable;
    }, []),
  );

  return useMemo(() => {
    return !isGuestUser && !isReadOnlyUser && getCombinedConditions();
  }, [getCombinedConditions, isGuestUser, isReadOnlyUser]);
};
