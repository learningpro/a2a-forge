import { useState } from "react";
import { TestPanel as ManualTestPanel } from "../test/TestPanel";
import { SuitePanel } from "../suite/SuitePanel";

type Tab = "test" | "suites";

export function TestPanel() {
  const [activeTab, setActiveTab] = useState<Tab>("test");

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg-primary)", minWidth: 0 }}>
      {/* Tab bar */}
      <div style={{
        display: "flex", gap: 0, borderBottom: "0.5px solid var(--border-subtle)",
        background: "var(--bg-primary)", flexShrink: 0,
      }}>
        <TabButton label="Test" active={activeTab === "test"} onClick={() => setActiveTab("test")} />
        <TabButton label="Suites" active={activeTab === "suites"} onClick={() => setActiveTab("suites")} />
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {activeTab === "test" ? <ManualTestPanel /> : <SuitePanel />}
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
      }}
    >
      {label}
    </button>
  );
}
