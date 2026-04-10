import { useState, useCallback } from "react";
import { useSuiteStore } from "../../stores/suiteStore";
import { useCommunityStore } from "../../stores/communityStore";
import { useAgentStore } from "../../stores/agentStore";
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

  const handleExport = useCallback(async () => {
    if (!selectedSuiteId) return;
    try {
      const json = await useCommunityStore.getState().exportSuite(selectedSuiteId);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `suite-${selectedSuiteId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  }, [selectedSuiteId]);

  const handleImport = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      const aid = agentId ?? useAgentStore.getState().selectedAgentId ?? "";
      try {
        await useCommunityStore.getState().importSuite(text, aid, workspaceId);
        await useSuiteStore.getState().loadSuites(workspaceId);
      } catch { /* ignore */ }
    };
    input.click();
  }, [agentId, workspaceId]);

  if (isLoading) {
    return (
      <div style={{ padding: 16, color: "var(--text-muted)", fontSize: 11 }}>
        {t("suite.loading")}
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
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={handleImport}
            title={t("suite.import")}
            style={{
              padding: "2px 6px",
              fontSize: 11,
              background: "transparent",
              border: "0.5px solid var(--border-subtle)",
              borderRadius: "var(--radius-md, 6px)",
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            ↓
          </button>
          {selectedSuiteId && (
            <button
              onClick={handleExport}
              title={t("suite.export")}
              style={{
                padding: "2px 6px",
                fontSize: 11,
                background: "transparent",
                border: "0.5px solid var(--border-subtle)",
                borderRadius: "var(--radius-md, 6px)",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              ↑
            </button>
          )}
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
            placeholder={t("suite.namePlaceholder")}
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
  const { t } = useT();
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
        title={t("suite.deleteSuite")}
      >
        ×
      </button>
    </div>
  );
}
