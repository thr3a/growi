import type { IPagePopulatedToShowRevision } from '@growi/core';
import { useHydrateAtoms } from 'jotai/utils';

import {
  currentPageDataAtom,
  currentPageIdAtom,
  isForbiddenAtom,
  latestRevisionAtom,
  pageNotCreatableAtom,
  pageNotFoundAtom,
  redirectFromAtom,
  remoteRevisionBodyAtom,
  remoteRevisionIdAtom,
  shareLinkIdAtom,
  templateBodyAtom,
  templateTagsAtom,
} from './internal-atoms';

/**
 * Hook for hydrating page-related atoms with server-side data
 * Simplified to focus on the most common use case: hydrating with page data
 *
 * This replaces the complex shouldMutate logic in useSWRxCurrentPage
 * with simple, direct atom initialization
 *
 * Data sources:
 * - page._id, page.revision -> Auto-extracted from IPagePopulatedToShowRevision
 * - remoteRevisionId, remoteRevisionBody -> Auto-extracted from page.revision
 * - templateTags, templateBody, isLatestRevision -> Explicitly provided via options
 *
 * @example
 * // Basic usage
 * useHydratePageAtoms(pageWithMeta?.data);
 *
 * // With template data and custom flags
 * useHydratePageAtoms(pageWithMeta?.data, {
 *   isLatestRevision: false,
 *   templateTags: ['tag1', 'tag2'],
 *   templateBody: 'Template content'
 * });
 */
export const useHydratePageAtoms = (
  page: IPagePopulatedToShowRevision | undefined,
  options?: {
    isLatestRevision?: boolean;
    shareLinkId?: string;
    isNotFound?: boolean; // always overwrited
    isNotCreatable?: boolean; // always overwrited
    isForbidden?: boolean; // always overwrited
    redirectFrom?: string; // always overwrited
    templateTags?: string[]; // always overwrited
    templateBody?: string; // always overwrited
  },
): void => {
  useHydrateAtoms([
    // Core page state - automatically extract from page object
    [currentPageIdAtom, page?._id],
    [currentPageDataAtom, page],

    // ShareLink page state
    [shareLinkIdAtom, options?.shareLinkId],

    // Remote revision data - auto-extracted from page.revision
    [remoteRevisionIdAtom, page?.revision?._id],
    [remoteRevisionBodyAtom, page?.revision?.body],
  ]);

  // always overwrited
  useHydrateAtoms(
    [
      [pageNotFoundAtom, options?.isNotFound ?? (page == null || page.isEmpty)],
      [pageNotCreatableAtom, options?.isNotCreatable ?? false],
      [isForbiddenAtom, options?.isForbidden ?? false],
      [latestRevisionAtom, options?.isLatestRevision ?? true],
      [redirectFromAtom, options?.redirectFrom ?? undefined],
      // Template data - from options (not auto-extracted from page)
      [templateTagsAtom, options?.templateTags ?? []],
      [templateBodyAtom, options?.templateBody ?? ''],
    ],
    { dangerouslyForceHydrate: true },
  );
};
