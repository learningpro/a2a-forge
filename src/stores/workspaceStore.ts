import { create } from "zustand";
import { persist } from "zustand/middleware";
import { commands, unwrap } from "../bindings";

export interface Workspace {
  id: string;
  name: string;
  createdAt: number;
}

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string;

  loadWorkspaces: () => Promise<void>;
  createWorkspace: (name: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  setActiveWorkspace: (id: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, _get) => ({
      workspaces: [],
      activeWorkspaceId: "default",

      loadWorkspaces: async () => {
        const workspaces = unwrap(await commands.listWorkspaces()) as unknown as Workspace[];
        set({ workspaces });
      },

      createWorkspace: async (name: string) => {
        unwrap(await commands.createWorkspace(name));
        const workspaces = unwrap(await commands.listWorkspaces()) as unknown as Workspace[];
        set({ workspaces });
      },

      deleteWorkspace: async (id: string) => {
        unwrap(await commands.deleteWorkspace(id));
        const workspaces = unwrap(await commands.listWorkspaces()) as unknown as Workspace[];
        set((state) => ({
          workspaces,
          activeWorkspaceId:
            state.activeWorkspaceId === id ? "default" : state.activeWorkspaceId,
        }));
      },

      setActiveWorkspace: (id: string) => set({ activeWorkspaceId: id }),
    }),
    {
      name: "a2a-workspace-state",
      partialize: (state) => ({ activeWorkspaceId: state.activeWorkspaceId }),
    },
  ),
);
