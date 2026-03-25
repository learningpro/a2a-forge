import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "./hooks/useTheme";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { AppShell } from "./components/layout/AppShell";
import { useTestStore } from "./stores/testStore";
import { useAgentStore } from "./stores/agentStore";
import { generateCurlCommand } from "./lib/curl";
import { buildTaskSendPayload, generateTaskId } from "./lib/a2a";

function App() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    // Initialize SQLite database connection before any commands can use it
    import("@tauri-apps/plugin-sql").then((mod) =>
      mod.default.load("sqlite:workbench.db").then(() => setDbReady(true))
    ).catch((err) => {
      console.error("Failed to initialize database:", err);
      setDbReady(true); // Continue anyway, commands will show errors
    });
  }, []);

  useTheme();

  const handleAddAgent = useCallback(() => {
    // Dispatch a custom event that Sidebar listens for
    document.dispatchEvent(new CustomEvent("a2a:add-agent"));
  }, []);

  const handleRunTest = useCallback(() => {
    // Dispatch a custom event that TestPanel can listen for
    document.dispatchEvent(new CustomEvent("a2a:run-test"));
  }, []);

  const handleCopyCurl = useCallback(() => {
    const agent = useAgentStore.getState().selectedAgent();
    const skillId = useAgentStore.getState().selectedSkillId;
    if (!agent || !skillId) return;

    const skill = agent.card.skills.find((s) => s.id === skillId);
    if (!skill) return;

    const { inputText, customHeaders } = useTestStore.getState();
    const taskId = generateTaskId();
    const payload = buildTaskSendPayload(skill.id, inputText, taskId);

    const curl = generateCurlCommand(
      agent.url,
      payload,
      undefined,
      Object.keys(customHeaders).length > 0 ? customHeaders : undefined,
    );

    navigator.clipboard.writeText(curl);
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

  return <AppShell />;
}

export default App;
