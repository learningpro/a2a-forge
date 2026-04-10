import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "./hooks/useTheme";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { AppShell } from "./components/layout/AppShell";
import { useTestStore } from "./stores/testStore";
import { useAgentStore } from "./stores/agentStore";
import { useUiStore } from "./stores/uiStore";
import { generateCurlCommand } from "./lib/curl";
import { buildTaskSendPayload, generateTaskId } from "./lib/a2a";
import { I18nProvider } from "./lib/i18n";

function App() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    if ((window as any).__WEB_MODE__) {
      setDbReady(true);
      return;
    }
    import("@tauri-apps/plugin-sql").then((mod) =>
      mod.default.load("sqlite:workbench.db").then(() => setDbReady(true))
    ).catch((err) => {
      console.error("Failed to initialize database:", err);
      setDbError(err instanceof Error ? err.message : String(err));
    });
  }, []);

  useTheme();

  const handleAddAgent = useCallback(() => {
    useUiStore.getState().requestAddAgent();
  }, []);

  const handleRunTest = useCallback(() => {
    useUiStore.getState().requestRunTest();
  }, []);

  const handleCopyCurl = useCallback(() => {
    const agentState = useAgentStore.getState();
    const agent = agentState.selectedAgent();
    const skillId = agentState.selectedSkillId;
    if (!agent || !skillId) return;

    const skill = agent.card.skills.find((s) => s.id === skillId);
    if (!skill) return;

    const { inputText, customHeaders, contextData, droppedFile } = useTestStore.getState();
    const agentDefaultHeaders = agentState.defaultHeaders[agent.id] ?? {};
    const merged = { ...agentDefaultHeaders, ...customHeaders };
    const taskId = generateTaskId();
    const payload = buildTaskSendPayload(skill.id, inputText, taskId, contextData, droppedFile);

    const authHeader = merged["Authorization"]
      ? `Authorization: ${merged["Authorization"]}`
      : undefined;
    const { Authorization: _, ...rest } = merged;

    const curl = generateCurlCommand(
      agent.url,
      payload,
      authHeader,
      Object.keys(rest).length > 0 ? rest : undefined,
    );

    navigator.clipboard.writeText(curl).catch(() => { /* clipboard permission denied */ });
  }, []);

  const handlers = useMemo(
    () => ({
      onAddAgent: handleAddAgent,
      onRunTest: handleRunTest,
      onCopyCurl: handleCopyCurl,
    }),
    [handleAddAgent, handleRunTest, handleCopyCurl],
  );

  useKeyboardShortcuts(handlers);

  if (dbError) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", background: "var(--bg-tertiary)", color: "var(--dot-error, #e53e3e)",
        fontFamily: "var(--font-sans, system-ui, sans-serif)", fontSize: "13px",
        flexDirection: "column", gap: 8,
      }}>
        <div style={{ fontWeight: 500 }}>Database initialization failed</div>
        <div style={{ color: "var(--text-muted)", fontSize: 11, maxWidth: 400, textAlign: "center" }}>{dbError}</div>
      </div>
    );
  }

  if (!dbReady) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", background: "var(--bg-tertiary)", color: "var(--text-muted)",
        fontFamily: "Inter, system-ui, sans-serif", fontSize: "13px",
      }}>
        Initializing...
      </div>
    );
  }

  return <I18nProvider><AppShell /></I18nProvider>;
}

export default App;
