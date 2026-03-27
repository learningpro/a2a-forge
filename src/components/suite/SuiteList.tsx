import { useState, useCallback } from "react";
import { useSuiteStore } from "../../stores/suiteStore";
import type { Suite } from "../../lib/suite-commands";
import { EmptyState } from "../shared/EmptyState";
import { useT } from "../../lib/i18n";

interface SuiteListProps {
  workspaceId: string;
  agentId?: string | null;
}

export function SuiteList({ workspaceId, agentId }: SuiteListProps) {
  const { t } = useT();
  const suites = useSuiteStore((s) => s.suites);
  const selectedSuiteId = useSuiteStore((s) => s.selectedSuiteId);
  const isLoading = useSuiteStore((s) => s.isLoading);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;
    const { createSuite, selectSuite } = useSuiteStore.getState();
    const suite = await createSuite(newName.trim(), "", agentId ?? null, workspaceId, "sequential");
    selectSuite(suite.id);
    setNewName("");
    setShowCreate(false);
  }, [newName, agentId, workspaceId]);

  const handleSelect = useCallback((suite: Suite) => {
    useSuiteStore.getState().selectSuite(suite.id);
  }, []);

  const handleDelete = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await useSuiteStore.getState().deleteSuite(id);
  }, []);

  if (isLoading) {
    return (
      <div style={{ padding: 16, color: "var(--text-muted)", fontSize: 11 }}>
        Loading suites...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div
        style={{
          padding: "8px 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "0.5px solid var(--border-subtle)",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          Test Suites
        </span>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding: "2px 8px",
            fontSize: 11,
            background: "transparent",
            border: "0.5px solid var(--border-subtle)",
            borderRadius: "var(--radius-md, 6px)",
            color: "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          + New
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ padding: "8px 12px", borderBottom: "0.5px solid var(--border-subtle)" }}>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") setShowCreate(false);
            }}
            placeholder="Suite name..."
            style={{
              width: "100%",
              padding: "4px 8px",
              fontSize: 11,
              border: "0.5px solid var(--border-strong)",
              borderRadius: "var(--radius-md, 6px)",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
              outline: "none",
            }}
          />
        </div>
      )}

      {/* Suite list */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {suites.length === 0 && !showCreate && (
          <EmptyState
            icon="suite"
            title={t("empty.noSuites")}
            description={t("empty.noSuitesDesc")}
            action={{ label: t("action.newSuite"), onClick: () => setShowCreate(true) }}
          />
        )}
        {suites.map((suite) => (
          <SuiteListItem
            key={suite.id}
            suite={suite}
            isSelected={suite.id === selectedSuiteId}
            onSelect={handleSelect}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}

function SuiteListItem({
  suite,
  isSelected,
  onSelect,
  onDelete,
}: {
  suite: Suite;
  isSelected: boolean;
  onSelect: (s: Suite) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
}) {
  return (
    <div
      onClick={() => onSelect(suite)}
      style={{
        padding: "8px 12px",
        cursor: "pointer",
        background: isSelected ? "var(--bg-secondary)" : "transparent",
        borderBottom: "0.5px solid var(--border-subtle)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: "var(--text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {suite.name}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
          {suite.runMode} · {suite.agentId ? "agent" : "workspace"}
        </div>
      </div>
      <button
        onClick={(e) => onDelete(e, suite.id)}
        style={{
          padding: "2px 4px",
          fontSize: 11,
          background: "transparent",
          border: "none",
          color: "var(--text-muted)",
          cursor: "pointer",
          opacity: 0.6,
          flexShrink: 0,
        }}
        title="Delete suite"
      >
        ×
      </button>
    </div>
  );
}
