import { useEffect } from 'react';

import type {
  UpdateDescCountData,
  UpdateDescCountRawData,
} from '~/interfaces/websocket';
import { SocketEventName } from '~/interfaces/websocket';
import { useGlobalSocket } from '~/states/socket-io';

import { usePageTreeDescCountMapAction } from '../states/page-tree-desc-count-map';

/**
 * Hook to listen for Socket.io UpdateDescCount events and update the page tree state
 *
 * This hook subscribes to the UpdateDescCount socket event, which is emitted by the server
 * when descendant counts change (e.g., when pages are created, deleted, or moved).
 * The received data is converted from raw format (Record) to Map format and stored in Jotai state.
 */
export const useSocketUpdateDescCount = (): void => {
  const socket = useGlobalSocket();
  const { update: updatePtDescCountMap } = usePageTreeDescCountMapAction();

  useEffect(() => {
    if (socket == null) {
      return;
    }

    const handler = (data: UpdateDescCountRawData) => {
      // Convert from Record to Map format for Jotai state
      const newData: UpdateDescCountData = new Map(Object.entries(data));
      updatePtDescCountMap(newData);
    };

    socket.on(SocketEventName.UpdateDescCount, handler);

    return () => {
      socket.off(SocketEventName.UpdateDescCount, handler);
    };
  }, [socket, updatePtDescCountMap]);
};
