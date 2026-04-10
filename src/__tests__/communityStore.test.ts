import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/community-commands", () => ({
  communityCommands: {
    listCommunityAgents: vi.fn().mockResolvedValue([]),
    submitToCommunity: vi.fn().mockResolvedValue({ id: "ca-1", name: "Agent", description: "desc", url: "http://a", cardJson: "{}", tags: "[]", author: "", stars: 0, lastChecked: "", createdAt: "" }),
    toggleFavorite: vi.fn().mockResolvedValue(true),
    listFavorites: vi.fn().mockResolvedValue([]),
    updateFavorite: vi.fn().mockResolvedValue(undefined),
    checkAgentHealth: vi.fn().mockResolvedValue({ id: "hc-1", agentId: "a-1", status: "healthy", latencyMs: 50, error: null, checkedAt: "" }),
    checkAllHealth: vi.fn().mockResolvedValue([]),
    listHealthChecks: vi.fn().mockResolvedValue([]),
    exportTestSuite: vi.fn().mockResolvedValue('{"suite":"data"}'),
    importTestSuite: vi.fn().mockResolvedValue("suite-new"),
  },
}));

import { useCommunityStore } from "../stores/communityStore";
import { communityCommands } from "../lib/community-commands";

describe("communityStore", () => {
  beforeEach(() => {
    useCommunityStore.setState({
      communityAgents: [],
      favorites: [],
      healthChecks: {},
      latestHealth: {},
      isChecking: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe("searchCommunity", () => {
    it("fetches agents and updates state", async () => {
      const agents = [{ id: "ca-1", name: "A", description: "", url: "http://a", cardJson: "{}", tags: "[]", author: "", stars: 0, lastChecked: "", createdAt: "" }];
      vi.mocked(communityCommands.listCommunityAgents).mockResolvedValueOnce(agents);

      await useCommunityStore.getState().searchCommunity("test");
      expect(communityCommands.listCommunityAgents).toHaveBeenCalledWith("test", null);
      expect(useCommunityStore.getState().communityAgents).toEqual(agents);
      expect(useCommunityStore.getState().error).toBeNull();
    });

    it("sets error on failure", async () => {
      vi.mocked(communityCommands.listCommunityAgents).mockRejectedValueOnce(new Error("network"));
      await useCommunityStore.getState().searchCommunity();
      expect(useCommunityStore.getState().error).toContain("network");
    });
  });

  describe("submitAgent", () => {
    it("prepends submitted agent to list", async () => {
      useCommunityStore.setState({
        communityAgents: [{ id: "ca-0", name: "Old", description: "", url: "", cardJson: "{}", tags: "[]", author: "", stars: 0, lastChecked: "", createdAt: "" }],
      });

      await useCommunityStore.getState().submitAgent("a-1");
      expect(communityCommands.submitToCommunity).toHaveBeenCalledWith("a-1");
      expect(useCommunityStore.getState().communityAgents).toHaveLength(2);
      expect(useCommunityStore.getState().communityAgents[0].id).toBe("ca-1");
    });
  });

  describe("favorites", () => {
    it("toggleFavorite reloads favorites list", async () => {
      const favs = [{ id: "f-1", agentId: "a-1", folder: "", notes: "", createdAt: "" }];
      vi.mocked(communityCommands.listFavorites).mockResolvedValueOnce(favs);

      const result = await useCommunityStore.getState().toggleFavorite("a-1");
      expect(result).toBe(true);
      expect(useCommunityStore.getState().favorites).toEqual(favs);
    });

    it("loadFavorites fetches and sets", async () => {
      const favs = [{ id: "f-1", agentId: "a-1", folder: "test", notes: "", createdAt: "" }];
      vi.mocked(communityCommands.listFavorites).mockResolvedValueOnce(favs);

      await useCommunityStore.getState().loadFavorites("test");
      expect(communityCommands.listFavorites).toHaveBeenCalledWith("test");
      expect(useCommunityStore.getState().favorites).toEqual(favs);
    });

    it("updateFavorite reloads list", async () => {
      vi.mocked(communityCommands.listFavorites).mockResolvedValueOnce([]);
      await useCommunityStore.getState().updateFavorite("f-1", "folder", "notes");
      expect(communityCommands.updateFavorite).toHaveBeenCalledWith("f-1", "folder", "notes");
    });
  });

  describe("health checks", () => {
    it("checkHealth updates latestHealth for agent", async () => {
      await useCommunityStore.getState().checkHealth("a-1");
      expect(useCommunityStore.getState().latestHealth["a-1"]).toBeDefined();
      expect(useCommunityStore.getState().latestHealth["a-1"].status).toBe("healthy");
      expect(useCommunityStore.getState().isChecking).toBe(false);
    });

    it("checkAllHealth maps results by agentId", async () => {
      const checks = [
        { id: "hc-1", agentId: "a-1", status: "healthy", latencyMs: 50, error: null, checkedAt: "" },
        { id: "hc-2", agentId: "a-2", status: "unhealthy", latencyMs: null, error: "timeout", checkedAt: "" },
      ];
      vi.mocked(communityCommands.checkAllHealth).mockResolvedValueOnce(checks);

      await useCommunityStore.getState().checkAllHealth("ws-1");
      const latest = useCommunityStore.getState().latestHealth;
      expect(latest["a-1"].status).toBe("healthy");
      expect(latest["a-2"].status).toBe("unhealthy");
    });

    it("loadHealthHistory stores checks under agentId", async () => {
      const history = [{ id: "hc-1", agentId: "a-1", status: "healthy", latencyMs: 50, error: null, checkedAt: "" }];
      vi.mocked(communityCommands.listHealthChecks).mockResolvedValueOnce(history);

      await useCommunityStore.getState().loadHealthHistory("a-1");
      expect(useCommunityStore.getState().healthChecks["a-1"]).toEqual(history);
    });
  });

  describe("suite export/import", () => {
    it("exportSuite returns JSON string", async () => {
      const result = await useCommunityStore.getState().exportSuite("suite-1");
      expect(result).toBe('{"suite":"data"}');
    });

    it("importSuite returns new suite ID", async () => {
      const id = await useCommunityStore.getState().importSuite('{"suite":"data"}', "a-1", "ws-1");
      expect(id).toBe("suite-new");
    });
  });
});
