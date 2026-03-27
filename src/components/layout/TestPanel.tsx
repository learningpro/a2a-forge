import { useState, useRef, useEffect } from "react";
import { TestPanel as ManualTestPanel } from "../test/TestPanel";
import { SuitePanel } from "../suite/SuitePanel";
import { ProxyPanel } from "../proxy/ProxyPanel";
import { CommunityPanel } from "../community/CommunityPanel";
import { WorkspacePanel } from "../workspace/WorkspacePanel";
import { tabSwitch } from "../../lib/animations";
import { useT } from "../../lib/i18n";

type Tab = "test" | "suites" | "proxy" | "community" | "workspace";

export function TestPanel() {
  const [activeTab, setActiveTab] = useState<Tab>("test");
  const contentRef = useRef<HTMLDivElement>(null);
  const { t } = useT();

  useEffect(() => {
    if (contentRef.current) tabSwitch(contentRef.current);
  }, [activeTab]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg-primary)", minWidth: 0 }}>
      {/* Tab bar */}
      <div style={{
        display: "flex", gap: 0, borderBottom: "0.5px solid var(--border-subtle)",
        background: "var(--bg-primary)", flexShrink: 0,
      }}>
        <TabButton label={t("tab.test")} active={activeTab === "test"} onClick={() => setActiveTab("test")} />
        <TabButton label={t("tab.suites")} active={activeTab === "suites"} onClick={() => setActiveTab("suites")} />
        <TabButton label={t("tab.proxy")} active={activeTab === "proxy"} onClick={() => setActiveTab("proxy")} />
        <TabButton label={t("tab.community")} active={activeTab === "community"} onClick={() => setActiveTab("community")} />
        <TabButton label={t("tab.workspace")} active={activeTab === "workspace"} onClick={() => setActiveTab("workspace")} />
      </div>

      {/* Tab content */}
      <div ref={contentRef} style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {activeTab === "test" && <ManualTestPanel />}
        {activeTab === "suites" && <SuitePanel />}
        {activeTab === "proxy" && <ProxyPanel />}
        {activeTab === "community" && <CommunityPanel />}
        {activeTab === "workspace" && <WorkspacePanel />}
      </div>
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        fontSize: 11,
        fontWeight: active ? 600 : 400,
        color: active ? "var(--text-primary)" : "var(--text-muted)",
        background: "transparent",
        border: "none",
        borderBottom: active ? "2px solid var(--text-primary)" : "2px solid transparent",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "color var(--duration-fast), border-color var(--duration-fast)",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = "var(--text-secondary)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = "var(--text-muted)"; }}
    >
      {label}
    </button>
  );
}
