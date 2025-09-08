import type { IPage, IUser } from '@growi/core/dist/interfaces';
import { isPermalink as _isPermalink, isCreatablePage, isTopPage } from '@growi/core/dist/utils/page-path-utils';
import { removeHeadingSlash } from '@growi/core/dist/utils/path-utils';
import type { model } from 'mongoose';
import type { GetServerSidePropsContext, GetServerSidePropsResult } from 'next';

import type { CrowiRequest } from '~/interfaces/crowi-request';
import type { PageModel } from '~/server/models/page';
import type { IPageRedirect, PageRedirectModel } from '~/server/models/page-redirect';

import type { CommonEachProps } from '../common-props';
import type { GeneralPageInitialProps, GeneralPageStatesProps } from '../general-page';

import type { EachProps } from './types';

// Utility to resolve path, redirect, and identical path page check
type PathResolutionResult = {
  resolvedPagePath: string;
  isIdenticalPathPage: boolean;
  redirectFrom?: string;
};

let mongooseModel: typeof model;
let Page: PageModel;
let PageRedirect: PageRedirectModel;

async function initModels(): Promise<void> {
  if (mongooseModel == null) {
    mongooseModel = (await import('mongoose')).model;
  }
  if (Page == null) {
    Page = mongooseModel<IPage, PageModel>('Page');
  }
  if (PageRedirect == null) {
    PageRedirect = mongooseModel<IPageRedirect, PageRedirectModel>('PageRedirect');
  }
}

async function resolvePathAndCheckIdentical(
    path: string,
    user: IUser | undefined,
): Promise<PathResolutionResult> {
  await initModels();

  const isPermalink = _isPermalink(path);
  let resolvedPagePath = path;
  let redirectFrom: string | undefined;
  let isIdenticalPathPage = false;

  if (!isPermalink) {
    const chains = await PageRedirect.retrievePageRedirectEndpoints(path);
    if (chains != null) {
      resolvedPagePath = chains.end.toPath;
      redirectFrom = chains.start.fromPath;
    }
    const multiplePagesCount = await Page.countByPathAndViewer(resolvedPagePath, user, null, true);
    isIdenticalPathPage = multiplePagesCount > 1;
  }
  return { resolvedPagePath, isIdenticalPathPage, redirectFrom };
}

function getPageStatesPropsForIdenticalPathPage(): GeneralPageStatesProps {
  return {
    isNotFound: false,
    isNotCreatable: true,
    isForbidden: false,
  };
}

async function getPageStatesProps(page: IPage | null, pagePath: string, pageId?: string | null): Promise<GeneralPageStatesProps> {
  await initModels();

  if (page != null) {
    // Existing page
    return {
      isNotFound: page.isEmpty,
      isNotCreatable: false,
      isForbidden: false,
    };
  }

  // Handle non-existent page
  const isPermalink = _isPermalink(pagePath);
  const count = isPermalink && pageId
    ? await Page.count({ _id: pageId })
    : await Page.count({ path: pagePath });

  return {
    isNotFound: true,
    isNotCreatable: !isCreatablePage(pagePath),
    isForbidden: count > 0,
  };
}

// Page data retrieval for initial load - returns GetServerSidePropsResult
export async function getPageDataForInitial(
    context: GetServerSidePropsContext,
): Promise<GetServerSidePropsResult<
  GeneralPageStatesProps &
  Pick<GeneralPageInitialProps, 'pageWithMeta' | 'skipSSR'> &
  Pick<EachProps, 'currentPathname' | 'isIdenticalPathPage' | 'redirectFrom'>
>> {
  const req: CrowiRequest = context.req as CrowiRequest;
  const { crowi, user } = req;
  const { revisionId } = req.query;

  // Parse path from URL
  let { path: pathFromQuery } = context.query;
  pathFromQuery = pathFromQuery != null ? pathFromQuery as string[] : [];
  let pathFromUrl = `/${pathFromQuery.join('/')}`;
  pathFromUrl = pathFromUrl === '//' ? '/' : pathFromUrl;

  const { pageService, configManager } = crowi;

  const pageId = _isPermalink(pathFromUrl) ? removeHeadingSlash(pathFromUrl) : null;
  const isPermalink = _isPermalink(pathFromUrl);

  const { resolvedPagePath, isIdenticalPathPage, redirectFrom } = await resolvePathAndCheckIdentical(pathFromUrl, user);

  if (isIdenticalPathPage) {
    return {
      props: {
        currentPathname: resolvedPagePath,
        isIdenticalPathPage: true,
        pageWithMeta: null,
        skipSSR: false,
        redirectFrom,
        ...getPageStatesPropsForIdenticalPathPage(),
      },
    };
  }

  // Get full page data
  const pageWithMeta = await pageService.findPageAndMetaDataByViewer(pageId, resolvedPagePath, user, true);
  const { data: page, meta } = pageWithMeta ?? {};

  // Add user to seen users
  if (page != null && user != null) {
    await page.seen(user);
  }

  if (page != null) {
    // Handle existing page
    page.initLatestRevisionField(revisionId);
    const ssrMaxRevisionBodyLength = configManager.getConfig('app:ssrMaxRevisionBodyLength');

    // Check if SSR should be skipped
    const latestRevisionBodyLength = await page.getLatestRevisionBodyLength();
    const skipSSR = latestRevisionBodyLength != null && ssrMaxRevisionBodyLength < latestRevisionBodyLength;

    const populatedPage = await page.populateDataToShowRevision(skipSSR);

    // Handle URL conversion
    let finalPathname = resolvedPagePath;
    if (page != null && !page.isEmpty) {
      if (isPermalink) {
        finalPathname = page.path;
      }
      else {
        const isToppage = isTopPage(resolvedPagePath);
        if (!isToppage) {
          finalPathname = `/${page._id}`;
        }
      }
    }

    return {
      props: {
        currentPathname: finalPathname,
        isIdenticalPathPage: false,
        pageWithMeta: { data: populatedPage, meta },
        skipSSR,
        redirectFrom,
        ...await getPageStatesProps(page, resolvedPagePath, pageId),
      },
    };
  }

  return {
    props: {
      currentPathname: resolvedPagePath,
      isIdenticalPathPage: false,
      pageWithMeta: null,
      skipSSR: false,
      redirectFrom,
      ...await getPageStatesProps(null, resolvedPagePath, pageId),
    },
  };
}

// Page data retrieval for same-route navigation
export async function getPageDataForSameRoute(
    context: GetServerSidePropsContext,
): Promise<GetServerSidePropsResult<
    GeneralPageStatesProps &
    Pick<CommonEachProps, 'currentPathname'> &
    Pick<EachProps, 'currentPathname' | 'isIdenticalPathPage' | 'redirectFrom'>
>> {
  const req: CrowiRequest = context.req as CrowiRequest;
  const { user } = req;

  const currentPathname = decodeURIComponent(context.resolvedUrl?.split('?')[0] ?? '/');
  const pageId = _isPermalink(currentPathname) ? removeHeadingSlash(currentPathname) : null;
  const isPermalink = _isPermalink(currentPathname);

  const { resolvedPagePath, isIdenticalPathPage, redirectFrom } = await resolvePathAndCheckIdentical(currentPathname, user);

  if (isIdenticalPathPage) {
    return {
      props: {
        currentPathname: resolvedPagePath,
        isIdenticalPathPage: true,
        redirectFrom,
        ...getPageStatesPropsForIdenticalPathPage(),
      },
    };
  }

  // For same route access, do minimal page lookup
  const basicPageInfo = await Page.findOne(
    isPermalink ? { _id: pageId } : { path: resolvedPagePath },
  ).exec();

  let finalPathname = resolvedPagePath;
  if (basicPageInfo != null && !basicPageInfo.isEmpty) {
    if (isPermalink) {
      finalPathname = basicPageInfo.path;
    }
    else {
      const isToppage = isTopPage(resolvedPagePath);
      if (!isToppage) {
        finalPathname = `/${basicPageInfo._id}`;
      }
    }
  }

  return {
    props: {
      currentPathname: finalPathname,
      isIdenticalPathPage: false,
      redirectFrom,
      ...await getPageStatesProps(basicPageInfo, resolvedPagePath, pageId),
    },
  };
}
