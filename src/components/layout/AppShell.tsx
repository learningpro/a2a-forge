import { useCallback } from "react";
import { useUiStore } from "../../stores/uiStore";
import { Sidebar } from "./Sidebar";
import { SkillPanel } from "./SkillPanel";
import { ResizeHandle } from "./ResizeHandle";
import { TestPanel } from "./TestPanel";

export function AppShell() {
  const skillPanelWidth = useUiStore((s) => s.skillPanelWidth);
  const setSkillPanelWidth = useUiStore((s) => s.setSkillPanelWidth);

  const handleResize = useCallback(
    (deltaX: number) => {
      setSkillPanelWidth(Math.max(160, Math.min(480, skillPanelWidth + deltaX)));
    },
    [skillPanelWidth, setSkillPanelWidth]
  );

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
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
      <SkillPanel width={skillPanelWidth} />
      <ResizeHandle onResize={handleResize} />
      <TestPanel />
    </div>
  );
}
