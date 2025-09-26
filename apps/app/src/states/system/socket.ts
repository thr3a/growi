import { useAtomValue } from 'jotai';
import { atomWithLazy } from 'jotai/utils';
import type { Socket } from 'socket.io-client';
import io from 'socket.io-client';

import loggerFactory from '~/utils/logger';

const logger = loggerFactory('growi:cli:states:socket');

const socketFactory = (namespace: string): Socket => {
  const socket = io(namespace, {
    transports: ['websocket'],
  });

  socket.on('connect_error', (error) => {
    logger.error(namespace, error);
  });
  socket.on('error', (error) => {
    logger.error(namespace, error);
  });

  return socket;
};

// Lazy atoms for socket instances (created only when accessed)
const defaultSocketAtom = atomWithLazy(() => socketFactory('/'));
const adminSocketAtom = atomWithLazy(() => socketFactory('/admin'));

// Hooks for socket access
export const useDefaultSocket = (): Socket => {
  return useAtomValue(defaultSocketAtom);
};

export const useAdminSocket = (): Socket => {
  return useAtomValue(adminSocketAtom);
};

// Generic socket hook (for custom namespaces if needed)
const socketCacheMap = new Map<
  string,
  ReturnType<typeof atomWithLazy<Socket>>
>();

export const useSocket = (namespace: string): Socket => {
  if (!socketCacheMap.has(namespace)) {
    socketCacheMap.set(
      namespace,
      atomWithLazy<Socket>(() => socketFactory(namespace)),
    );
  }
  const socketAtom = socketCacheMap.get(namespace)!;
  return useAtomValue(socketAtom);
};
