import { useCallback } from 'react';

import { useSWRStatic } from '@growi/core/dist/swr';
import { type SWRResponse } from 'swr';
import useSWRImmutable from 'swr/immutable';

import { apiv3Get } from '~/client/util/apiv3-client';

import { type AccessibleAiAssistantsHasId, type AiAssistantHasId } from '../../interfaces/ai-assistant';
import type { IThreadRelationHasId } from '../../interfaces/thread-relation';

export const useSWRxAiAssistants = (): SWRResponse<AccessibleAiAssistantsHasId, Error> => {
  return useSWRImmutable<AccessibleAiAssistantsHasId>(
    ['/openai/ai-assistants'],
    ([endpoint]) => apiv3Get(endpoint).then(response => response.data.accessibleAiAssistants),
  );
};

/*
*  useAiAssistantSidebar
*/
type AiAssistantSidebarStatus = {
  isOpened: boolean,
  isEditorAssistant?: boolean,
  aiAssistantData?: AiAssistantHasId,
  threadData?: IThreadRelationHasId,
}

type AiAssistantSidebarUtils = {
  openChat(
    aiAssistantData: AiAssistantHasId,
    threadData?: IThreadRelationHasId,
  ): void
  openEditor(): void
  close(): void
  refreshAiAssistantData(aiAssistantData?: AiAssistantHasId): void
  refreshThreadData(threadData?: IThreadRelationHasId): void
}

export const useAiAssistantSidebar = (
    status?: AiAssistantSidebarStatus,
): SWRResponse<AiAssistantSidebarStatus, Error> & AiAssistantSidebarUtils => {
  const initialStatus = { isOpened: false };
  const swrResponse = useSWRStatic<AiAssistantSidebarStatus, Error>('AiAssistantSidebar', status, { fallbackData: initialStatus });

  return {
    ...swrResponse,
    openChat: useCallback(
      (aiAssistantData: AiAssistantHasId, threadData?: IThreadRelationHasId) => {
        swrResponse.mutate({ isOpened: true, aiAssistantData, threadData });
      }, [swrResponse],
    ),
    openEditor: useCallback(
      () => {
        swrResponse.mutate({
          isOpened: true, isEditorAssistant: true, aiAssistantData: undefined, threadData: undefined,
        });
      }, [swrResponse],
    ),
    close: useCallback(
      () => swrResponse.mutate({
        isOpened: false, isEditorAssistant: false, aiAssistantData: undefined, threadData: undefined,
      }), [swrResponse],
    ),
    refreshAiAssistantData: useCallback(
      (aiAssistantData) => {
        swrResponse.mutate((currentState = { isOpened: false }) => {
          return { ...currentState, aiAssistantData };
        });
      }, [swrResponse],
    ),
    refreshThreadData: useCallback(
      (threadData?: IThreadRelationHasId) => {
        swrResponse.mutate((currentState = { isOpened: false }) => {
          return { ...currentState, threadData };
        });
      }, [swrResponse],
    ),
  };
};
