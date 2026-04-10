import { useState, useEffect, useRef } from "react";
import { useUiStore } from "../../stores/uiStore";
import { useAgentStore } from "../../stores/agentStore";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { AgentListItem } from "../agent/AgentListItem";
import { AddAgentDialog } from "../agent/AddAgentDialog";
import { staggerIn } from "../../lib/animations";
import { EmptyState } from "../shared/EmptyState";
import { useT } from "../../lib/i18n";

export function Sidebar() {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed);
  const sidebarWidth = useUiStore((s) => s.sidebarWidth);
  const addAgentRequested = useUiStore((s) => s.addAgentRequested);
  const { t } = useT();

  const agents = useAgentStore((s) => s.agents);
  const selectedAgentId = useAgentStore((s) => s.selectedAgentId);
  const setSelectedAgentId = useAgentStore((s) => s.setSelectedAgentId);

  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const loadWorkspaces = useWorkspaceStore((s) => s.loadWorkspaces);
  const createWorkspace = useWorkspaceStore((s) => s.createWorkspace);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const agentListRef = useRef<HTMLDivElement>(null);

  // Animate agent list when agents change
  useEffect(() => {
    if (agentListRef.current && agents.length > 0) {
      const items = agentListRef.current.querySelectorAll("[data-agent-item]");
      if (items.length > 0) staggerIn(items, 0.04);
    }
  }, [agents]);

  // Open add-agent dialog when requested via store
  useEffect(() => {
    if (addAgentRequested > 0) setShowAddDialog(true);
  }, [addAgentRequested]);

  // Load workspaces and agents on mount
  useEffect(() => {
    loadWorkspaces().catch(() => { /* ignore init failure */ });
  }, [loadWorkspaces]);

  useEffect(() => {
    useAgentStore.getState().loadAgents(activeWorkspaceId);
  }, [activeWorkspaceId]);

  const handleWorkspaceChange = (id: string) => {
    setActiveWorkspace(id);
    // loadAgents is triggered by useEffect on activeWorkspaceId
  };

  const handleAddWorkspace = () => {
    setShowNewWorkspace(true);
  };

  const handleCreateWorkspace = () => {
    if (!newWorkspaceName.trim()) return;
    createWorkspace(newWorkspaceName.trim()).catch(() => { /* ignore */ });
    setNewWorkspaceName("");
    setShowNewWorkspace(false);
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
      {/* Header — extra top padding for macOS traffic lights */}
      <div
        data-tauri-drag-region
        style={{
          padding: sidebarCollapsed ? "38px 8px 10px" : "38px 14px 10px",
          borderBottom: "0.5px solid var(--border-subtle)",
        }}
      >
        {!sidebarCollapsed && (
          <>
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "var(--text-muted)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              {t("sidebar.agents")}
            </div>
            <button
              onClick={() => setShowAddDialog(true)}
              title={t("sidebar.addAgentCard")}
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
                transition: "background var(--duration-normal), color var(--duration-normal), border-color var(--duration-normal)",
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
              <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> {t("sidebar.addAgentCard")}
            </button>
          </>
        )}
      </div>

      {/* Agent list */}
      <div
        ref={agentListRef}
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
          <EmptyState
            icon="agent"
            title={t("empty.noAgents")}
            description={t("empty.noAgentsDesc")}
            action={{ label: t("sidebar.addAgent"), onClick: () => setShowAddDialog(true) }}
          />
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
                fontSize: 11,
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>{t("sidebar.workspace")}</span>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={handleAddWorkspace}
                  title={t("sidebar.createWorkspace")}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    fontSize: 14,
                    padding: "4px 6px",
                    lineHeight: 1,
                    borderRadius: "var(--radius-md)",
                    minWidth: 28,
                    minHeight: 28,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "color var(--duration-normal), background var(--duration-normal)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--bg-tertiary)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-muted)";
                  }}
                >
                  +
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
              <option value="default">{t("sidebar.default")}</option>
              {workspaces
                .filter((w) => w.id !== "default")
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
            </select>
            {showNewWorkspace && (
              <div style={{ display: "flex", gap: 4 }}>
                <input
                  autoFocus
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateWorkspace();
                    if (e.key === "Escape") { setShowNewWorkspace(false); setNewWorkspaceName(""); }
                  }}
                  placeholder={t("sidebar.createWorkspace")}
                  style={{
                    flex: 1, padding: "4px 8px", fontSize: 11,
                    background: "var(--bg-primary)", border: "0.5px solid var(--border-default)",
                    borderRadius: "var(--radius-md)", color: "var(--text-primary)",
                    outline: "none", fontFamily: "inherit",
                  }}
                />
                <button
                  onClick={handleCreateWorkspace}
                  style={{
                    padding: "4px 8px", fontSize: 11, background: "var(--text-primary)",
                    border: "none", borderRadius: "var(--radius-md)", color: "var(--bg-primary)",
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {t("action.add")}
                </button>
              </div>
            )}
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
            padding: "6px 0",
            textAlign: sidebarCollapsed ? "center" : "left",
            minHeight: 32,
            borderRadius: "var(--radius-md)",
            transition: "color var(--duration-normal), background var(--duration-normal)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-muted)";
          }}
          title={sidebarCollapsed ? t("sidebar.expand") : t("sidebar.collapse")}
        >
          {sidebarCollapsed ? "\u25B6" : "\u25C0"}
        </button>
      </div>

      {/* Add Agent Dialog */}
      <AddAgentDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        workspaceId={activeWorkspaceId}
      />
    </aside>
  );
}
