import { useCallback } from 'react';
import { atom, useAtomValue, useSetAtom } from 'jotai';

export type SearchModalStatus = {
  isOpened: boolean;
  searchKeyword?: string;
};

export type SearchModalActions = {
  open: (keywordOnInit?: string) => void;
  close: () => void;
};

// Atom definition
const searchModalAtom = atom<SearchModalStatus>({
  isOpened: false,
  searchKeyword: undefined,
});

// Read-only hook (useAtomValue)
export const useSearchModalStatus = (): SearchModalStatus => {
  return useAtomValue(searchModalAtom);
};

// Actions hook (useSetAtom + useCallback)
export const useSearchModalActions = (): SearchModalActions => {
  const setStatus = useSetAtom(searchModalAtom);

  const open = useCallback(
    (keywordOnInit?: string) => {
      setStatus({
        isOpened: true,
        searchKeyword: keywordOnInit,
      });
    },
    [setStatus],
  );

  const close = useCallback(() => {
    setStatus({
      isOpened: false,
      searchKeyword: undefined,
    });
  }, [setStatus]);

  return { open, close };
};
