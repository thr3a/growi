import type EventEmitter from 'node:events';
import { AcceptedUploadFileType } from '@growi/core';
import { useAtomValue } from 'jotai';
import type { SWRResponse } from 'swr';
import useSWRImmutable from 'swr/immutable';

import {
  isUploadAllFileAllowedAtom,
  isUploadEnabledAtom,
} from '~/states/server-configurations';

declare global {
  // eslint-disable-next-line vars-on-top, no-var
  var globalEmitter: EventEmitter;
}

/** **********************************************************
 *                     Computed contexts
 *********************************************************** */

export const useAcceptedUploadFileType = (): SWRResponse<
  AcceptedUploadFileType,
  Error
> => {
  const isUploadEnabled = useAtomValue(isUploadEnabledAtom);
  const isUploadAllFileAllowed = useAtomValue(isUploadAllFileAllowedAtom);

  return useSWRImmutable(
    ['acceptedUploadFileType', isUploadEnabled, isUploadAllFileAllowed],
    ([, isUploadEnabled, isUploadAllFileAllowed]) => {
      if (!isUploadEnabled) {
        return AcceptedUploadFileType.NONE;
      }
      if (isUploadAllFileAllowed) {
        return AcceptedUploadFileType.ALL;
      }
      return AcceptedUploadFileType.IMAGE;
    },
  );
};
