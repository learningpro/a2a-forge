import { useState, useEffect } from "react";
import { useUiStore } from "../../stores/uiStore";
import { useAgentStore } from "../../stores/agentStore";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { AgentListItem } from "../agent/AgentListItem";
import { AddAgentDialog } from "../agent/AddAgentDialog";
import { SettingsModal } from "../settings/SettingsModal";

export function Sidebar() {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed);
  const sidebarWidth = useUiStore((s) => s.sidebarWidth);

  const agents = useAgentStore((s) => s.agents);
  const selectedAgentId = useAgentStore((s) => s.selectedAgentId);
  const setSelectedAgentId = useAgentStore((s) => s.setSelectedAgentId);

  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const loadWorkspaces = useWorkspaceStore((s) => s.loadWorkspaces);
  const createWorkspace = useWorkspaceStore((s) => s.createWorkspace);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Listen for global keyboard shortcut event
  useEffect(() => {
    const handler = () => setShowAddDialog(true);
    document.addEventListener("a2a:add-agent", handler);
    return () => document.removeEventListener("a2a:add-agent", handler);
  }, []);

  // Load workspaces and agents on mount
  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  useEffect(() => {
    useAgentStore.getState().loadAgents(activeWorkspaceId);
  }, [activeWorkspaceId]);

  const handleWorkspaceChange = (id: string) => {
    setActiveWorkspace(id);
    useAgentStore.getState().loadAgents(id);
  };

  const handleAddWorkspace = () => {
    const name = window.prompt("New workspace name:");
    if (!name?.trim()) return;
    createWorkspace(name.trim());
  };

  const handleAddFromExample = () => {
    setShowAddDialog(true);
  };

  return (
    <aside
      style={{
        width: sidebarCollapsed ? 48 : sidebarWidth,
        minWidth: sidebarCollapsed ? 48 : sidebarWidth,
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
              title="Add agent (Cmd+N)"
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
        {agents.length === 0 && !sidebarCollapsed && (
          <div
            style={{
              padding: "20px 12px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
              Get started by adding your first A2A agent
            </div>
            <button
              onClick={handleAddFromExample}
              style={{
                fontSize: 10,
                padding: "4px 8px",
                background: "var(--bg-info)",
                border: "0.5px solid var(--border-info)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-info)",
                cursor: "pointer",
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                lineHeight: 1.4,
              }}
              title="Add the AIGC example agent"
            >
              https://aigc-service.echonlab.com
            </button>
          </div>
        )}
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
            <div
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>Workspace</span>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={handleAddWorkspace}
                  title="Create workspace"
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    fontSize: 13,
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  +
                </button>
                <button
                  onClick={() => setSettingsOpen(true)}
                  title="Settings"
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    fontSize: 12,
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  {"\u2699"}
                </button>
              </div>
            </div>
            <select
              value={activeWorkspaceId}
              onChange={(e) => handleWorkspaceChange(e.target.value)}
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
              <option value="default">Default</option>
              {workspaces
                .filter((w) => w.id !== "default")
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
            </select>
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

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </aside>
  );
}
