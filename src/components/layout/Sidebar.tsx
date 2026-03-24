import { useState, useEffect } from "react";
import { useUiStore } from "../../stores/uiStore";
import { useAgentStore } from "../../stores/agentStore";
import { commands } from "../../bindings";
import { AgentListItem } from "../agent/AgentListItem";
import { AddAgentDialog } from "../agent/AddAgentDialog";

async function handleExport() {
  try {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const filePath = await save({
      defaultPath: "agents-export.json",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!filePath) return;
    const jsonData = await commands.exportAgents("default");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    await writeTextFile(filePath, jsonData);
  } catch (e) {
    console.error("Export failed:", e);
  }
}

async function handleImport() {
  try {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const filePath = await open({
      filters: [{ name: "JSON", extensions: ["json"] }],
      multiple: false,
    });
    if (!filePath || Array.isArray(filePath)) return;
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const jsonData = await readTextFile(filePath as string);
    await commands.importAgents(jsonData, "default");
    await useAgentStore.getState().loadAgents("default");
  } catch (e) {
    console.error("Import failed:", e);
  }
}

export function Sidebar() {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed);

  const agents = useAgentStore((s) => s.agents);
  const selectedAgentId = useAgentStore((s) => s.selectedAgentId);
  const setSelectedAgentId = useAgentStore((s) => s.setSelectedAgentId);

  const [showAddDialog, setShowAddDialog] = useState(false);

  // Load agents from SQLite on mount
  useEffect(() => {
    useAgentStore.getState().loadAgents("default");
  }, []);

  const importExportButtonStyle: React.CSSProperties = {
    fontSize: 10,
    padding: "3px 8px",
    background: "transparent",
    border: "0.5px solid var(--border-subtle)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontFamily: "inherit",
  };

  return (
    <aside
      style={{
        width: sidebarCollapsed ? 48 : 220,
        minWidth: sidebarCollapsed ? 48 : 220,
        background: "var(--bg-secondary)",
        borderRight: "0.5px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.15s, min-width 0.15s",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: sidebarCollapsed ? "14px 8px 10px" : "14px 14px 10px",
          borderBottom: "0.5px solid var(--border-subtle)",
        }}
      >
        {!sidebarCollapsed && (
          <>
            <div
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: "var(--text-muted)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Agents
            </div>
            <button
              onClick={() => setShowAddDialog(true)}
              style={{
                width: "100%",
                padding: "6px 10px",
                background: "var(--bg-primary)",
                border: "0.5px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                fontSize: 11,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.background = "var(--bg-info)";
                el.style.color = "var(--text-info)";
                el.style.borderColor = "var(--border-info)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.background = "var(--bg-primary)";
                el.style.color = "var(--text-primary)";
                el.style.borderColor = "var(--border-default)";
              }}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> Add agent card
            </button>
          </>
        )}
      </div>

      {/* Agent list */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 8,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {agents.map((agent) => (
          <AgentListItem
            key={agent.id}
            agent={agent}
            isActive={agent.id === selectedAgentId}
            onClick={() => setSelectedAgentId(agent.id)}
          />
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: sidebarCollapsed ? "10px 8px" : "10px 14px",
          borderTop: "0.5px solid var(--border-subtle)",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {!sidebarCollapsed && (
          <>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Workspace</div>
            <select
              style={{
                width: "100%",
                padding: "4px 8px",
                fontSize: 11,
                background: "var(--bg-primary)",
                border: "0.5px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <option>Default</option>
            </select>
            {/* Import/Export buttons */}
            <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
              <button
                onClick={handleImport}
                style={importExportButtonStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-default)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                Import
              </button>
              <button
                onClick={handleExport}
                style={importExportButtonStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-default)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                Export
              </button>
            </div>
          </>
        )}
        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
            fontSize: 12,
            padding: "4px 0",
            textAlign: sidebarCollapsed ? "center" : "left",
          }}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? "\u25B6" : "\u25C0"}
        </button>
      </div>

      {/* Add Agent Dialog */}
      <AddAgentDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
      />
    </aside>
  );
}
