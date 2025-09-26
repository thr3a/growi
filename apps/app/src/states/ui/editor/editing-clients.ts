import type { EditingClient } from '@growi/editor';
import { atom, useAtomValue, useSetAtom } from 'jotai';

// Atom definition
const editingClientsAtom = atom<EditingClient[]>([]);

// Read-only hook
export const useEditingClients = (): EditingClient[] => {
  return useAtomValue(editingClientsAtom);
};

// Setter hook
export const useSetEditingClients = () => {
  return useSetAtom(editingClientsAtom);
};

// Actions hook for mutate compatibility
export const useEditingClientsActions = () => {
  const setEditingClients = useSetAtom(editingClientsAtom);

  const mutate = (newClients?: EditingClient[]) => {
    if (newClients !== undefined) {
      setEditingClients(newClients);
    }
  };

  return { mutate };
};
