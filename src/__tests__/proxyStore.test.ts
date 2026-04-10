import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/proxy-commands", () => ({
  proxyCommands: {
    startProxy: vi.fn().mockResolvedValue({ running: true, port: 9339, requestCount: 0 }),
    stopProxy: vi.fn().mockResolvedValue(undefined),
    getProxyStatus: vi.fn().mockResolvedValue({ running: false, port: 0, requestCount: 0 }),
    listRules: vi.fn().mockResolvedValue([]),
    createRule: vi.fn().mockResolvedValue({ id: "r-1", name: "Rule", enabled: true, matchType: "all", matchValue: "", actionType: "log", actionJson: "{}", priority: 0, workspaceId: "ws-1", createdAt: "" }),
    deleteRule: vi.fn().mockResolvedValue(undefined),
    toggleRule: vi.fn().mockResolvedValue(undefined),
    startRecording: vi.fn().mockResolvedValue(undefined),
    stopRecording: vi.fn().mockResolvedValue(undefined),
    listRecordings: vi.fn().mockResolvedValue([]),
    getRecording: vi.fn().mockResolvedValue([]),
    deleteRecording: vi.fn().mockResolvedValue(undefined),
    replayRecording: vi.fn().mockResolvedValue([]),
  },
}));

import { useProxyStore } from "../stores/proxyStore";
import { proxyCommands } from "../lib/proxy-commands";

describe("proxyStore", () => {
  beforeEach(() => {
    useProxyStore.setState({
      status: { running: false, port: 0, requestCount: 0 },
      rules: [],
      recordings: [],
      currentRecords: [],
      isRecording: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe("proxy lifecycle", () => {
    it("startProxy updates status", async () => {
      await useProxyStore.getState().startProxy(9339, "ws-1");
      expect(proxyCommands.startProxy).toHaveBeenCalledWith(9339, "ws-1");
      expect(useProxyStore.getState().status.running).toBe(true);
      expect(useProxyStore.getState().status.port).toBe(9339);
    });

    it("startProxy sets error on failure", async () => {
      vi.mocked(proxyCommands.startProxy).mockRejectedValueOnce(new Error("port in use"));
      await useProxyStore.getState().startProxy();
      expect(useProxyStore.getState().error).toContain("port in use");
    });

    it("stopProxy resets status", async () => {
      useProxyStore.setState({ status: { running: true, port: 9339, requestCount: 5 } });
      await useProxyStore.getState().stopProxy();
      expect(useProxyStore.getState().status.running).toBe(false);
      expect(useProxyStore.getState().status.port).toBe(0);
    });

    it("refreshStatus fetches current status", async () => {
      vi.mocked(proxyCommands.getProxyStatus).mockResolvedValueOnce({ running: true, port: 9339, requestCount: 10 });
      await useProxyStore.getState().refreshStatus();
      expect(useProxyStore.getState().status.requestCount).toBe(10);
    });
  });

  describe("rules", () => {
    it("loadRules fetches and sets rules", async () => {
      const rules = [{ id: "r-1", name: "R", enabled: true, matchType: "all", matchValue: "", actionType: "log", actionJson: "{}", priority: 0, workspaceId: "ws-1", createdAt: "" }];
      vi.mocked(proxyCommands.listRules).mockResolvedValueOnce(rules);

      await useProxyStore.getState().loadRules("ws-1");
      expect(useProxyStore.getState().rules).toEqual(rules);
    });

    it("createRule appends to rules", async () => {
      await useProxyStore.getState().createRule("Rule", "all", "", "log", "{}", 0, "ws-1");
      expect(useProxyStore.getState().rules).toHaveLength(1);
      expect(useProxyStore.getState().rules[0].id).toBe("r-1");
    });

    it("deleteRule removes from rules", async () => {
      useProxyStore.setState({
        rules: [
          { id: "r-1", name: "A", enabled: true, matchType: "all", matchValue: "", actionType: "log", actionJson: "{}", priority: 0, workspaceId: "ws-1", createdAt: "" },
          { id: "r-2", name: "B", enabled: true, matchType: "all", matchValue: "", actionType: "log", actionJson: "{}", priority: 0, workspaceId: "ws-1", createdAt: "" },
        ],
      });

      await useProxyStore.getState().deleteRule("r-1");
      expect(useProxyStore.getState().rules).toHaveLength(1);
      expect(useProxyStore.getState().rules[0].id).toBe("r-2");
    });

    it("toggleRule updates enabled state", async () => {
      useProxyStore.setState({
        rules: [{ id: "r-1", name: "A", enabled: true, matchType: "all", matchValue: "", actionType: "log", actionJson: "{}", priority: 0, workspaceId: "ws-1", createdAt: "" }],
      });

      await useProxyStore.getState().toggleRule("r-1", false);
      expect(useProxyStore.getState().rules[0].enabled).toBe(false);
    });
  });

  describe("recording", () => {
    it("startRecording sets isRecording", async () => {
      await useProxyStore.getState().startRecording("session-1");
      expect(proxyCommands.startRecording).toHaveBeenCalledWith("session-1");
      expect(useProxyStore.getState().isRecording).toBe(true);
    });

    it("stopRecording clears isRecording", async () => {
      useProxyStore.setState({ isRecording: true });
      await useProxyStore.getState().stopRecording();
      expect(useProxyStore.getState().isRecording).toBe(false);
    });

    it("loadRecordings fetches sessions", async () => {
      const sessions = [{ name: "s1", count: 3 }];
      vi.mocked(proxyCommands.listRecordings).mockResolvedValueOnce(sessions);

      await useProxyStore.getState().loadRecordings("ws-1");
      expect(useProxyStore.getState().recordings).toEqual(sessions);
    });

    it("viewRecording loads records", async () => {
      const records = [{ id: "tr-1", sessionName: "s1", agentId: "a-1", skillName: "sk", requestJson: "{}", responseJson: null, statusCode: 200, durationMs: 50, timestamp: "", workspaceId: "ws-1" }];
      vi.mocked(proxyCommands.getRecording).mockResolvedValueOnce(records);

      await useProxyStore.getState().viewRecording("s1", "ws-1");
      expect(useProxyStore.getState().currentRecords).toEqual(records);
    });

    it("deleteRecording removes from list", async () => {
      useProxyStore.setState({ recordings: [{ name: "s1", count: 3 }, { name: "s2", count: 1 }] });
      await useProxyStore.getState().deleteRecording("s1", "ws-1");
      expect(useProxyStore.getState().recordings).toHaveLength(1);
      expect(useProxyStore.getState().recordings[0].name).toBe("s2");
    });

    it("replayRecording sets currentRecords with results", async () => {
      const results = [{ id: "tr-1", sessionName: "replay:s1", agentId: "a-1", skillName: "sk", requestJson: "{}", responseJson: '{"ok":true}', statusCode: 200, durationMs: 100, timestamp: "", workspaceId: "ws-1" }];
      vi.mocked(proxyCommands.replayRecording).mockResolvedValueOnce(results);

      await useProxyStore.getState().replayRecording("s1", "ws-1");
      expect(useProxyStore.getState().currentRecords).toEqual(results);
    });
  });
});
