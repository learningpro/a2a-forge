import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock workspace-commands before importing the store
vi.mock("../lib/workspace-commands", () => ({
  workspaceCommands: {
    listEnvVars: vi.fn().mockResolvedValue([]),
    setEnvVar: vi.fn().mockResolvedValue(undefined),
    deleteEnvVar: vi.fn().mockResolvedValue(undefined),
    listChains: vi.fn().mockResolvedValue([]),
    createChain: vi.fn().mockResolvedValue({ id: "chain-1", name: "Test Chain", description: "", workspaceId: "ws-1", createdAt: "" }),
    deleteChain: vi.fn().mockResolvedValue(undefined),
    listChainSteps: vi.fn().mockResolvedValue([]),
    addChainStep: vi.fn().mockResolvedValue({ id: "step-1", chainId: "chain-1", sortOrder: 0, name: "Step 1", agentId: "a-1", skillName: "s-1", requestJson: "{}", extractJson: "{}", timeoutMs: 30000 }),
    deleteChainStep: vi.fn().mockResolvedValue(undefined),
    runChain: vi.fn().mockResolvedValue({ chainId: "chain-1", status: "completed", steps: [], variables: {}, durationMs: 100 }),
    diffResponses: vi.fn().mockResolvedValue({ identical: true, added: [], removed: [], changed: [] }),
    exportWorkspace: vi.fn().mockResolvedValue('{"workspaceName":"test"}'),
    importWorkspace: vi.fn().mockResolvedValue("ws-new"),
  },
}));

import { useWorkspaceAdvancedStore } from "../stores/workspaceAdvancedStore";
import { workspaceCommands } from "../lib/workspace-commands";

describe("workspaceAdvancedStore", () => {
  beforeEach(() => {
    // Reset store state
    useWorkspaceAdvancedStore.setState({
      envVars: [],
      chains: [],
      selectedChainId: null,
      chainSteps: [],
      chainRunResult: null,
      diffResult: null,
      isRunningChain: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe("env vars", () => {
    it("loadEnvVars calls command and updates state", async () => {
      const mockVars = [{ id: "v1", workspaceId: "ws-1", name: "API_KEY", value: "123", isSecret: false, createdAt: "" }];
      vi.mocked(workspaceCommands.listEnvVars).mockResolvedValueOnce(mockVars);

      await useWorkspaceAdvancedStore.getState().loadEnvVars("ws-1");
      expect(workspaceCommands.listEnvVars).toHaveBeenCalledWith("ws-1");
      expect(useWorkspaceAdvancedStore.getState().envVars).toEqual(mockVars);
    });

    it("deleteEnvVar removes from state", async () => {
      useWorkspaceAdvancedStore.setState({
        envVars: [
          { id: "v1", workspaceId: "ws-1", name: "A", value: "1", isSecret: false, createdAt: "" },
          { id: "v2", workspaceId: "ws-1", name: "B", value: "2", isSecret: false, createdAt: "" },
        ],
      });

      await useWorkspaceAdvancedStore.getState().deleteEnvVar("v1");
      expect(useWorkspaceAdvancedStore.getState().envVars).toHaveLength(1);
      expect(useWorkspaceAdvancedStore.getState().envVars[0].id).toBe("v2");
    });
  });

  describe("chains", () => {
    it("createChain adds to state", async () => {
      const chain = await useWorkspaceAdvancedStore.getState().createChain("Test", "desc", "ws-1");
      expect(chain.id).toBe("chain-1");
      expect(useWorkspaceAdvancedStore.getState().chains).toHaveLength(1);
    });

    it("deleteChain removes from state and clears selection", async () => {
      useWorkspaceAdvancedStore.setState({
        chains: [{ id: "chain-1", name: "C", description: "", workspaceId: "ws-1", createdAt: "" }],
        selectedChainId: "chain-1",
      });

      await useWorkspaceAdvancedStore.getState().deleteChain("chain-1");
      expect(useWorkspaceAdvancedStore.getState().chains).toHaveLength(0);
      expect(useWorkspaceAdvancedStore.getState().selectedChainId).toBeNull();
    });

    it("selectChain updates selectedChainId and clears run result", () => {
      useWorkspaceAdvancedStore.setState({ chainRunResult: { chainId: "x", status: "completed", steps: [], variables: {}, durationMs: 0 } });
      useWorkspaceAdvancedStore.getState().selectChain("chain-2");
      expect(useWorkspaceAdvancedStore.getState().selectedChainId).toBe("chain-2");
      expect(useWorkspaceAdvancedStore.getState().chainRunResult).toBeNull();
    });
  });

  describe("chain steps", () => {
    it("addChainStep appends to state", async () => {
      await useWorkspaceAdvancedStore.getState().addChainStep("chain-1", "Step 1", "a-1", "s-1", "{}", "{}");
      expect(useWorkspaceAdvancedStore.getState().chainSteps).toHaveLength(1);
      expect(useWorkspaceAdvancedStore.getState().chainSteps[0].name).toBe("Step 1");
    });

    it("deleteChainStep removes from state", async () => {
      useWorkspaceAdvancedStore.setState({
        chainSteps: [
          { id: "s1", chainId: "c1", sortOrder: 0, name: "A", agentId: "a1", skillName: "sk1", requestJson: "{}", extractJson: "{}", timeoutMs: 30000 },
          { id: "s2", chainId: "c1", sortOrder: 1, name: "B", agentId: "a1", skillName: "sk1", requestJson: "{}", extractJson: "{}", timeoutMs: 30000 },
        ],
      });

      await useWorkspaceAdvancedStore.getState().deleteChainStep("s1");
      expect(useWorkspaceAdvancedStore.getState().chainSteps).toHaveLength(1);
      expect(useWorkspaceAdvancedStore.getState().chainSteps[0].id).toBe("s2");
    });
  });

  describe("run chain", () => {
    it("sets isRunningChain during execution", async () => {
      const promise = useWorkspaceAdvancedStore.getState().runChain("chain-1");
      expect(useWorkspaceAdvancedStore.getState().isRunningChain).toBe(true);
      await promise;
      expect(useWorkspaceAdvancedStore.getState().isRunningChain).toBe(false);
      expect(useWorkspaceAdvancedStore.getState().chainRunResult).toBeTruthy();
    });

    it("handles errors gracefully", async () => {
      vi.mocked(workspaceCommands.runChain).mockRejectedValueOnce(new Error("fail"));
      await useWorkspaceAdvancedStore.getState().runChain("chain-1");
      expect(useWorkspaceAdvancedStore.getState().isRunningChain).toBe(false);
      expect(useWorkspaceAdvancedStore.getState().error).toContain("fail");
    });
  });

  describe("diff", () => {
    it("diffResponses updates diffResult", async () => {
      await useWorkspaceAdvancedStore.getState().diffResponses('{"a":1}', '{"a":1}');
      expect(useWorkspaceAdvancedStore.getState().diffResult).toEqual({ identical: true, added: [], removed: [], changed: [] });
    });
  });

  describe("export/import", () => {
    it("exportWorkspace returns JSON string", async () => {
      const result = await useWorkspaceAdvancedStore.getState().exportWorkspace("ws-1");
      expect(result).toBe('{"workspaceName":"test"}');
      expect(workspaceCommands.exportWorkspace).toHaveBeenCalledWith("ws-1");
    });

    it("importWorkspace returns new workspace ID", async () => {
      const wsId = await useWorkspaceAdvancedStore.getState().importWorkspace('{"workspaceName":"imported"}');
      expect(wsId).toBe("ws-new");
      expect(workspaceCommands.importWorkspace).toHaveBeenCalledWith('{"workspaceName":"imported"}');
    });
  });
});
