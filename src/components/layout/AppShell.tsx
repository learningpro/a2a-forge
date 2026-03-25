import { useCallback } from "react";
import { useUiStore } from "../../stores/uiStore";
import { Sidebar } from "./Sidebar";
import { SkillPanel } from "./SkillPanel";
import { ResizeHandle } from "./ResizeHandle";
import { TestPanel } from "./TestPanel";

export function AppShell() {
  const skillPanelWidth = useUiStore((s) => s.skillPanelWidth);
  const setSkillPanelWidth = useUiStore((s) => s.setSkillPanelWidth);
  const sidebarWidth = useUiStore((s) => s.sidebarWidth);
  const setSidebarWidth = useUiStore((s) => s.setSidebarWidth);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);

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
        alignItems: "flex-start",
        justifyContent: "center",
        height: "100vh",
        padding: "24px",
        background: "var(--bg-tertiary)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          maxWidth: 1400,
          height: "100%",
          minWidth: 1024,
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          border: "0.5px solid var(--border-default)",
          boxShadow: "0 4px 32px rgba(0,0,0,0.08)",
          background: "var(--bg-tertiary)",
          fontSize: 12,
        }}
      >
        <Sidebar />
        {!sidebarCollapsed && <ResizeHandle onResize={handleSidebarResize} />}
        <SkillPanel width={skillPanelWidth} />
        <ResizeHandle onResize={handleSkillPanelResize} />
        <TestPanel />
      </div>
    </div>
  );
}
