import { useEffect } from 'react';
import { useGlobalSocket } from '@growi/core/dist/swr';

import { useCurrentPageYjsDataActions } from '~/features/collaborative-editor/states';
import { SocketEventName } from '~/interfaces/websocket';
import {
  useCurrentPageData,
  useCurrentPageId,
  usePageNotFound,
} from '~/states/page';

export const useCurrentPageYjsDataAutoLoadEffect = (): void => {
  const { fetchCurrentPageYjsData } = useCurrentPageYjsDataActions();
  const pageId = useCurrentPageId();
  const currentPage = useCurrentPageData();
  const isNotFound = usePageNotFound();

  // Optimized effects with minimal dependencies
  useEffect(() => {
    // Load YJS data only when revision changes and page exists
    if (pageId && currentPage?.revision?._id && !isNotFound) {
      fetchCurrentPageYjsData();
    }
  }, [currentPage?.revision?._id, fetchCurrentPageYjsData, isNotFound, pageId]);
};

export const useNewlyYjsDataSyncingEffect = (): void => {
  const { data: socket } = useGlobalSocket();
  const { updateHasYdocsNewerThanLatestRevision } =
    useCurrentPageYjsDataActions();

  useEffect(() => {
    if (socket == null) {
      return;
    }

    socket.on(
      SocketEventName.YjsHasYdocsNewerThanLatestRevisionUpdated,
      updateHasYdocsNewerThanLatestRevision,
    );

    return () => {
      socket.off(
        SocketEventName.YjsHasYdocsNewerThanLatestRevisionUpdated,
        updateHasYdocsNewerThanLatestRevision,
      );
    };
  }, [socket, updateHasYdocsNewerThanLatestRevision]);
};

export const useAwarenessSyncingEffect = (): void => {
  const { data: socket } = useGlobalSocket();
  const { updateAwarenessStateSize } = useCurrentPageYjsDataActions();

  useEffect(() => {
    if (socket == null) {
      return;
    }

    socket.on(
      SocketEventName.YjsAwarenessStateSizeUpdated,
      updateAwarenessStateSize,
    );

    return () => {
      socket.off(
        SocketEventName.YjsAwarenessStateSizeUpdated,
        updateAwarenessStateSize,
      );
    };
  }, [socket, updateAwarenessStateSize]);
};
