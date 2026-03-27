import { useCallback, useState } from "react";
import { useUiStore } from "../../stores/uiStore";
import { Sidebar } from "./Sidebar";
import { SkillPanel } from "./SkillPanel";
import { ResizeHandle } from "./ResizeHandle";
import { TestPanel } from "./TestPanel";
import { SettingsPanel } from "../settings/SettingsPanel";

export function AppShell() {
  const skillPanelWidth = useUiStore((s) => s.skillPanelWidth);
  const setSkillPanelWidth = useUiStore((s) => s.setSkillPanelWidth);
  const sidebarWidth = useUiStore((s) => s.sidebarWidth);
  const setSidebarWidth = useUiStore((s) => s.setSidebarWidth);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleSkillPanelResize = useCallback(
    (deltaX: number) => {
      setSkillPanelWidth(Math.max(160, Math.min(480, skillPanelWidth + deltaX)));
    },
    [skillPanelWidth, setSkillPanelWidth]
  );

  const handleSidebarResize = useCallback(
    (deltaX: number) => {
      setSidebarWidth(Math.max(140, Math.min(400, sidebarWidth + deltaX)));
    },
    [sidebarWidth, setSidebarWidth]
  );

  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg-tertiary)",
        fontSize: 13,
      }}
    >
      {/* Settings gear — top right */}
      <button
        onClick={() => setSettingsOpen(true)}
        title="Settings"
        style={{
          position: "absolute",
          top: 10,
          right: 14,
          zIndex: 10,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--text-muted)",
          padding: "4px 6px",
          borderRadius: "var(--radius-md)",
          minWidth: 28,
          minHeight: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "color 0.15s, background 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--text-primary)";
          e.currentTarget.style.background = "var(--bg-secondary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--text-muted)";
          e.currentTarget.style.background = "transparent";
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      <Sidebar />
      {!sidebarCollapsed && <ResizeHandle onResize={handleSidebarResize} />}
      <SkillPanel width={skillPanelWidth} />
      <ResizeHandle onResize={handleSkillPanelResize} />
      <TestPanel />

      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
