import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useAgentStore } from "../../stores/agentStore";
import { useTestStore } from "../../stores/testStore";
import { useUiStore } from "../../stores/uiStore";
import { useStreamingTask } from "../../hooks/useStreamingTask";
import {
  buildTaskSendPayload,
  buildTaskSubscribePayload,
  generateTaskId,
} from "../../lib/a2a";
import { generateCurlCommand } from "../../lib/curl";
import { commands, type AgentSkill, type JsonValue } from "../../bindings";
import { unwrap, type HistoryEntry } from "../../lib/tauri-helpers";
import { SkillMetadata } from "./SkillMetadata";
import { InputForm } from "./InputForm";
import { ResponseViewer } from "./ResponseViewer";
import { HistoryList } from "./HistoryList";
import { SavedTestsList } from "./SavedTestsList";

import { EmptyState } from "../shared/EmptyState";
import { useT } from "../../lib/i18n";
import { DEFAULT_TIMEOUT_MS } from "../../lib/constants";

const EMPTY_HEADERS: Record<string, string> = {};

export function TestPanel() {
  const agents = useAgentStore((s) => s.agents);
  const selectedAgentId = useAgentStore((s) => s.selectedAgentId);
  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId),
    [agents, selectedAgentId],
  );
  const selectedSkillId = useAgentStore((s) => s.selectedSkillId);
  const defaultHeaders = useAgentStore((s) => s.defaultHeaders);
  const agentDefaultHeaders = useMemo(
    () => (selectedAgentId ? defaultHeaders[selectedAgentId] : undefined) ?? EMPTY_HEADERS,
    [defaultHeaders, selectedAgentId],
  );

  const inputText = useTestStore((s) => s.inputText);
  const customHeaders = useTestStore((s) => s.customHeaders);
  const { run: runStreaming } = useStreamingTask();

  const [curlCopied, setCurlCopied] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [timeout, setTimeoutVal] = useState(DEFAULT_TIMEOUT_MS);
  const { t } = useT();
  const curlTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const rerunTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Load timeout setting
  useEffect(() => {
    commands.getSettings().then((res) => {
      const settings = unwrap(res) as Record<string, unknown>;
      if (settings["timeout_seconds"] != null) setTimeoutVal(Number(settings["timeout_seconds"]) * 1000);
    }).catch(() => {});
  }, []);
  useEffect(() => {
    return () => {
      if (curlTimerRef.current) clearTimeout(curlTimerRef.current);
      if (rerunTimerRef.current) clearTimeout(rerunTimerRef.current);
    };
  }, []);

  // Find selected skill
  const skill: AgentSkill | null =
    selectedAgent && selectedSkillId
      ? selectedAgent.card.skills.find((s) => s.id === selectedSkillId) ?? null
      : null;

  const agentId = selectedAgent?.id ?? "";
  const skillId = skill?.id ?? "";

  // Subscribe only to the specific execution, not the entire map
  const execKey = `${agentId}:${skillId}`;
  const exec = useTestStore((s) => s.executions[execKey]) ?? {
    taskId: null, status: "idle" as const, chunks: [], result: null, latencyMs: null, startedAt: null,
  };

  const isRunning = exec.status === "running";

  const handleCopyCurl = useCallback(() => {
    if (!selectedAgent || !skill) return;

    const taskId = generateTaskId();
    const { contextData, droppedFile } = useTestStore.getState();
    const payload = buildTaskSendPayload(skill.id, inputText, taskId, contextData, droppedFile);
    const merged = { ...agentDefaultHeaders, ...customHeaders };
    const authHeader = merged["Authorization"]
      ? `Authorization: ${merged["Authorization"]}`
      : undefined;
    const { Authorization: _, ...rest } = merged;

    const curl = generateCurlCommand(
      selectedAgent.url,
      payload,
      authHeader,
      Object.keys(rest).length > 0 ? rest : undefined,
    );

    navigator.clipboard.writeText(curl).then(() => {
      setCurlCopied(true);
      curlTimerRef.current = setTimeout(() => setCurlCopied(false), 1500);
    }).catch(() => { /* clipboard permission denied */ });
  }, [selectedAgent, skill, inputText, agentDefaultHeaders, customHeaders]);

  const handleRun = useCallback(async () => {
    if (!selectedAgent || !skill || isRunning) return;

    const taskId = generateTaskId();
    const hasStreaming = selectedAgent.card.capabilities.streaming === true;
    // Merge agent-level default headers with per-request custom headers (per-request wins)
    const merged = { ...agentDefaultHeaders, ...customHeaders };
    const authHeader = merged["Authorization"] || undefined;
    // Remove Authorization from extra headers since it's passed separately
    const { Authorization: _, ...rest } = merged;
    const extraHeaders =
      Object.keys(rest).length > 0 ? rest : undefined;
    const { startTask, finishTask, contextData, droppedFile } = useTestStore.getState();

    if (hasStreaming) {
      const payload = buildTaskSubscribePayload(skill.id, inputText, taskId, contextData, droppedFile);
      try {
        await runStreaming(
          selectedAgent.url,
          payload as unknown as JsonValue,
          selectedAgent.id,
          skill.id,
          authHeader,
          extraHeaders,
        );
      } catch (err) {
        finishTask(
          selectedAgent.id,
          skill.id,
          { error: err instanceof Error ? err.message : String(err) },
          "failed",
        );
      }
    } else {
      const payload = buildTaskSendPayload(skill.id, inputText, taskId, contextData, droppedFile);
      startTask(selectedAgent.id, skill.id, taskId);
      try {
        const result = unwrap(await commands.sendTask(
          selectedAgent.url,
          payload as unknown as JsonValue,
          authHeader ?? null,
          extraHeaders ?? null,
          Math.round(timeout / 1000) || null,
        ));
        finishTask(selectedAgent.id, skill.id, result, "completed");
      } catch (err) {
        finishTask(
          selectedAgent.id,
          skill.id,
          { error: err instanceof Error ? err.message : String(err) },
          "failed",
        );
      }
    }

    // Save history fire-and-forget
    const { contextData: ctx, droppedFile: file } = useTestStore.getState();
    const finalExec = useTestStore.getState().getExecution(selectedAgent.id, skill.id);
    const requestSnapshot: Record<string, unknown> = { skill: skill.id, text: inputText };
    if (ctx && ctx.trim() !== "{\n  \n}") requestSnapshot.context = ctx;
    if (file) requestSnapshot.file = file;
    commands
      .saveHistory(
        selectedAgent.id,
        skill.id,
        JSON.stringify(requestSnapshot),
        finalExec.result != null ? JSON.stringify(finalExec.result) : null,
        finalExec.status,
        finalExec.latencyMs,
      )
      .then(() => {
        // Refresh history list after saving
        setHistoryRefreshKey((k) => k + 1);
      })
      .catch(() => {
        /* fire-and-forget */
      });
  }, [
    selectedAgent,
    skill,
    isRunning,
    inputText,
    agentDefaultHeaders,
    customHeaders,
    runStreaming,
  ]);


  // Run test when requested via store (keyboard shortcut)
  const runTestRequested = useUiStore((s) => s.runTestRequested);
  useEffect(() => {
    if (runTestRequested > 0) {
      handleRun();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runTestRequested]);

  const handleHistorySelect = useCallback((entry: HistoryEntry) => {
    if (!selectedAgent || !skill) return;
    // Load the request into the input form
    try {
      const req = JSON.parse(entry.requestJson);
      if (req && typeof req === "object") {
        if ("text" in req) useTestStore.getState().setInputText(String(req.text));
        if ("context" in req) useTestStore.getState().setContextData(String(req.context));
        if ("file" in req) useTestStore.getState().setDroppedFile(req.file as { name: string; data: string } | null);
      }
    } catch { /* ignore parse error */ }
    // Show the response in the viewer
    if (entry.responseJson != null) {
      try {
        const resp = JSON.parse(entry.responseJson);
        useTestStore.getState().finishTask(
          selectedAgent.id,
          skill.id,
          resp,
          entry.status as "completed" | "failed",
        );
      } catch { /* ignore */ }
    }
  }, [selectedAgent, skill]);

  const handleRerun = useCallback(
    (payload: unknown) => {
      // Populate input from saved test payload and trigger run
      const p = payload as Record<string, unknown> | null;
      if (p && typeof p === "object") {
        const text = typeof p.text === "string" ? p.text : JSON.stringify(p, null, 2);
        useTestStore.getState().setInputText(text);
        useTestStore.getState().setInputTab("message");
      }
      // Auto-run after a tick so state is updated
      rerunTimerRef.current = setTimeout(() => {
        handleRun();
      }, 50);
    },
    [handleRun],
  );

  // Build the current payload for the saved tests "save current" button
  const contextData = useTestStore((s) => s.contextData);
  const droppedFile = useTestStore((s) => s.droppedFile);
  const currentPayload = useMemo(() => {
    if (!selectedAgent || !skill || !inputText) return undefined;
    const p: Record<string, unknown> = { skill: skill.id, text: inputText };
    if (contextData && contextData.trim() !== "{\n  \n}") p.context = contextData;
    if (droppedFile) p.file = droppedFile;
    return p;
  }, [selectedAgent, skill, inputText, contextData, droppedFile]);

  // No skill selected -- empty state
  if (!skill || !selectedAgent) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-primary)",
          minWidth: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "12px 16px 10px",
            borderBottom: "0.5px solid var(--border-subtle)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            }}
          >
            {t("skill.noSkillSelected")}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <div
            style={{
              width: "50%",
              borderRight: "0.5px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <EmptyState
              icon="test"
              title={t("empty.readyToTest")}
              description={t("empty.readyToTestDesc")}
            />
          </div>
          <div
            style={{
              width: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <EmptyState
              icon="skill"
              title={t("empty.resultsHere")}
              description={t("empty.resultsHereDesc")}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-primary)",
        minWidth: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px 10px",
          borderBottom: "0.5px solid var(--border-subtle)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <SkillMetadata skill={skill} />

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            onClick={handleCopyCurl}
            title={t("test.copyCurl")}
            style={{
              padding: "4px 8px",
              fontSize: 11,
              background: "transparent",
              border: "0.5px solid var(--border-subtle)",
              borderRadius: "var(--radius-md, 6px)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            }}
          >
            {curlCopied ? t("test.copied") : t("test.curl")}
          </button>
          <button
            onClick={handleRun}
            disabled={isRunning}
            style={{
              padding: "5px 14px",
              fontSize: 11,
              fontWeight: 500,
              background: "var(--bg-primary)",
              border: "0.5px solid var(--border-strong)",
              borderRadius: "var(--radius-md, 6px)",
              color: "var(--text-primary)",
              cursor: isRunning ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontFamily: "inherit",
              opacity: isRunning ? 0.7 : 1,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: isRunning ? "var(--dot-warning)" : "var(--dot-online)",
                flexShrink: 0,
              }}
            />
            {isRunning ? t("test.running") : t("action.run")}
          </button>
        </div>
      </div>

      {/* Body: input + output columns */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Input column */}
        <div
          className="input-col"
          style={{
            width: "50%",
            borderRight: "0.5px solid var(--border-subtle)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <InputForm
            skill={skill}
            card={selectedAgent.card}
          />

          {/* Saved tests */}
          <div
            style={{
              padding: "8px 14px 10px",
              borderTop: "0.5px solid var(--border-subtle)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                marginBottom: 6,
              }}
            >
              {t("test.savedTests")}
            </div>
            <SavedTestsList
              agentId={selectedAgent.id}
              skillName={skill.id}
              onRerun={handleRerun}
              currentPayload={currentPayload}
            />
          </div>
        </div>

        {/* Output column */}
        <div
          className="output-col"
          style={{
            width: "50%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <ResponseViewer agentId={selectedAgent.id} skillId={skill.id} />

          {/* History */}
          <div
            style={{
              borderTop: "0.5px solid var(--border-subtle)",
              height: 200,
              minHeight: 120,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                padding: "8px 12px 0",
              }}
            >
              {t("test.history")}
            </div>
            <HistoryList
              key={historyRefreshKey}
              agentId={selectedAgent.id}
              onSelectHistory={handleHistorySelect}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
