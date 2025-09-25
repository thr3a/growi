import type { ColorScheme } from '@growi/core';
import { atom, useAtom, useSetAtom } from 'jotai';


type ResolvedThemeState = {
  themeData?: ColorScheme;
};

const resolvedThemeAtom = atom<ResolvedThemeState>({
  themeData: undefined,
});

export const useResolvedTheme = () => {
  const [state] = useAtom(resolvedThemeAtom);
  return state;
};

export const useResolvedThemeActions = () => {
  const setState = useSetAtom(resolvedThemeAtom);

  return {
    mutateResolvedTheme: (resolvedTheme: ColorScheme) => {
      setState({ themeData: resolvedTheme });
    },
  };
};
