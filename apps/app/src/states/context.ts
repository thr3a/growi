import { atom, useAtomValue, useSetAtom } from 'jotai';
import { currentUserAtomGetter, growiCloudUriAtomGetter } from './global';

/**
 * Computed atom for checking if current user is a guest user
 * Depends on currentUser atom
 */
const isGuestUserAtom = atom((get) => {
  const currentUser = get(currentUserAtomGetter);
  return currentUser?._id == null;
});

// export const useIsGuestUser = () => {
//   return useAtom(isGuestUserAtom);
// };
export const useIsGuestUser = () => useAtomValue(isGuestUserAtom);

/**
 * Computed atom for checking if current user is a read-only user
 * Depends on currentUser and isGuestUser atoms
 */
const isReadOnlyUserAtom = atom((get) => {
  const currentUser = get(currentUserAtomGetter);
  const isGuestUser = get(isGuestUserAtom);

  return !isGuestUser && !!currentUser?.readOnly;
});

export const useIsReadOnlyUser = () => useAtomValue(isReadOnlyUserAtom);

/**
 * Computed atom for checking if current user is an admin
 * Depends on currentUser atom
 */
const isAdminAtom = atom((get) => {
  const currentUser = get(currentUserAtomGetter);
  return currentUser?.admin ?? false;
});

export const useIsAdmin = () => useAtomValue(isAdminAtom);

/**
 * Atom for checking if current user is a shared user
 */
const isSharedUserAtom = atom<boolean>(false);

export const useIsSharedUser = () => useAtomValue(isSharedUserAtom);

/**
 * Atom for checking if current page is a search page
 */
const isSearchPageAtom = atom<boolean | null>(null);
/**
 * Hook for getting the current search page state
 */
export const useIsSearchPage = () => useAtomValue(isSearchPageAtom);
/**
 * Hook for setting the current search page state
 */
export const useSetSearchPage = () => useSetAtom(isSearchPageAtom);

/**
 * Computed atom for GROWI documentation URL
 * Depends on growiCloudUri atom
 */
const growiDocumentationUrlAtom = atom((get) => {
  const growiCloudUri = get(growiCloudUriAtomGetter);

  if (growiCloudUri != null) {
    const url = new URL('/help', growiCloudUri);
    return url.toString();
  }

  return 'https://docs.growi.org';
});

export const useGrowiDocumentationUrl = () =>
  useAtomValue(growiDocumentationUrlAtom);
