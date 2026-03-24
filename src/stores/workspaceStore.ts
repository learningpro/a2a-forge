import { create } from "zustand";
import { persist } from "zustand/middleware";
import { commands } from "../bindings";

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
        const workspaces = await commands.listWorkspaces();
        set({ workspaces });
      },

      createWorkspace: async (name: string) => {
        await commands.createWorkspace(name);
        const workspaces = await commands.listWorkspaces();
        set({ workspaces });
      },

      deleteWorkspace: async (id: string) => {
        await commands.deleteWorkspace(id);
        const workspaces = await commands.listWorkspaces();
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
