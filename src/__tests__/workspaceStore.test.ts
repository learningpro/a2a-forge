import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../bindings", () => ({
  commands: {
    listWorkspaces: vi.fn().mockResolvedValue({ status: "ok", data: [] }),
    createWorkspace: vi.fn().mockResolvedValue({ status: "ok", data: { id: "ws-new", name: "New", createdAt: 1000 } }),
    deleteWorkspace: vi.fn().mockResolvedValue({ status: "ok", data: undefined }),
  },
}));

import { useWorkspaceStore } from "../stores/workspaceStore";
import { commands } from "../bindings";

describe("workspaceStore", () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      workspaces: [],
      activeWorkspaceId: "default",
    });
    vi.clearAllMocks();
  });

  it("initial state has empty workspaces and default active", () => {
    const state = useWorkspaceStore.getState();
    expect(state.workspaces).toEqual([]);
    expect(state.activeWorkspaceId).toBe("default");
  });

  it("loadWorkspaces fetches and sets workspaces", async () => {
    const mockWs = [
      { id: "ws-1", name: "Dev", createdAt: 100 },
      { id: "ws-2", name: "Prod", createdAt: 200 },
    ];
    vi.mocked(commands.listWorkspaces).mockResolvedValueOnce({ status: "ok", data: mockWs } as any);

    await useWorkspaceStore.getState().loadWorkspaces();
    expect(commands.listWorkspaces).toHaveBeenCalled();
    expect(useWorkspaceStore.getState().workspaces).toEqual(mockWs);
  });

  it("createWorkspace calls command and reloads list", async () => {
    const created = { id: "ws-new", name: "New", createdAt: 1000 };
    vi.mocked(commands.listWorkspaces).mockResolvedValueOnce({ status: "ok", data: [created] } as any);

    await useWorkspaceStore.getState().createWorkspace("New");
    expect(commands.createWorkspace).toHaveBeenCalledWith("New");
    expect(useWorkspaceStore.getState().workspaces).toEqual([created]);
  });

  it("deleteWorkspace removes and resets active if deleted was active", async () => {
    useWorkspaceStore.setState({
      workspaces: [
        { id: "ws-1", name: "A", createdAt: 100 },
        { id: "ws-2", name: "B", createdAt: 200 },
      ],
      activeWorkspaceId: "ws-1",
    });
    vi.mocked(commands.listWorkspaces).mockResolvedValueOnce({
      status: "ok",
      data: [{ id: "ws-2", name: "B", createdAt: 200 }],
    } as any);

    await useWorkspaceStore.getState().deleteWorkspace("ws-1");
    expect(commands.deleteWorkspace).toHaveBeenCalledWith("ws-1");
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe("default");
  });

  it("deleteWorkspace keeps active if different workspace deleted", async () => {
    useWorkspaceStore.setState({
      workspaces: [
        { id: "ws-1", name: "A", createdAt: 100 },
        { id: "ws-2", name: "B", createdAt: 200 },
      ],
      activeWorkspaceId: "ws-1",
    });
    vi.mocked(commands.listWorkspaces).mockResolvedValueOnce({
      status: "ok",
      data: [{ id: "ws-1", name: "A", createdAt: 100 }],
    } as any);

    await useWorkspaceStore.getState().deleteWorkspace("ws-2");
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe("ws-1");
  });

  it("setActiveWorkspace updates activeWorkspaceId", () => {
    useWorkspaceStore.getState().setActiveWorkspace("ws-99");
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe("ws-99");
  });
});
