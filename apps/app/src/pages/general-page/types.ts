import type {
  IDataWithMeta, IPageInfo, IPagePopulatedToShowRevision,
} from '@growi/core';

import type { RendererConfig } from '~/interfaces/services/renderer';
import type { PageDocument } from '~/server/models/page';

export type IPageToShowRevisionWithMeta = IDataWithMeta<IPagePopulatedToShowRevision & PageDocument, IPageInfo>;

export type RendererConfigProps = {
  rendererConfig: RendererConfig,
}

export type ServerConfigurationProps = {
  serverConfig: {
    aiEnabled: boolean;
    limitLearnablePageCountPerAssistant: number;
    isUsersHomepageDeletionEnabled: boolean;
    adminPreferredIndentSize: number;
    elasticsearchMaxBodyLengthToIndex: number;
    isRomUserAllowedToComment: boolean;
    drawioUri: string | null;
    isAllReplyShown: boolean;
    showPageSideAuthors: boolean;
    isContainerFluid: boolean;
    isEnabledStaleNotification: boolean;
    disableLinkSharing: boolean;
    isIndentSizeForced: boolean;
    isEnabledAttachTitleHeader: boolean;
    isSlackConfigured: boolean;
    isAclEnabled: boolean;
    isUploadEnabled: boolean;
    isUploadAllFileAllowed: boolean;
    isBulkExportPagesEnabled: boolean;
    isPdfBulkExportEnabled: boolean;
    isLocalAccountRegistrationEnabled: boolean;
  },
}

export type GeneralPageStatesProps = {
  isNotFound: boolean,
  isForbidden: boolean,
  isNotCreatable: boolean,
}

// Do not include CommonEachProps for multi stage
export type GeneralPageEachProps = GeneralPageStatesProps;

// Do not include CommonEachProps for multi stage
export type GeneralPageInitialProps = GeneralPageStatesProps & RendererConfigProps & ServerConfigurationProps & {
  pageWithMeta: IPageToShowRevisionWithMeta | null,
  skipSSR?: boolean,
}
