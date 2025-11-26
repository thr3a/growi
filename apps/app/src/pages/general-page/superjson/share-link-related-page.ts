import type { IPagePopulatedToShowRevision } from '@growi/core/dist/interfaces';
import superjson from 'superjson';

import type { PageDocument } from '~/server/models/page';

type IShareLinkRelatedPage = IPagePopulatedToShowRevision & PageDocument;

let isRegistered = false;

export const registerShareLinkRelatedPage = (): void => {
  if (isRegistered) return;

  superjson.registerCustom<IShareLinkRelatedPage, string>(
    {
      isApplicable: (v): v is IShareLinkRelatedPage => {
        return v != null && (v as PageDocument).toObject != null;
      },
      serialize: (v) => {
        return superjson.stringify(v.toObject());
      },
      deserialize: (v) => {
        return superjson.parse(v);
      },
    },
    'IShareLinkRelatedPageTransformer',
  );

  isRegistered = true;
};
