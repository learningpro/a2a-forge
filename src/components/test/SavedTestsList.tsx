import { useState, useEffect, useCallback } from "react";
import { commands } from "../../bindings";
import { unwrap } from "../../lib/tauri-helpers";

interface SavedTestsListProps {
  agentId: string;
  skillName: string;
  onRerun: (payload: unknown) => void;
  currentPayload?: unknown;
}

export function SavedTestsList({
  agentId,
  skillName,
  onRerun,
  currentPayload,
}: SavedTestsListProps) {
  const [tests, setTests] = useState<Array<{ id: string; name: string; agentId: string; skillId: string; payload: unknown; createdAt: number }>>([]);
  const [loading, setLoading] = useState(false);

  const loadTests = useCallback(async () => {
    setLoading(true);
    try {
      const all = unwrap(await commands.listSavedTests(agentId, skillName)) as unknown as Array<{ id: string; name: string; agentId: string; skillId: string; payload: unknown; createdAt: number }>;
      // Filter by skillName client-side if needed
      const filtered = skillName
        ? all.filter((t) => t.skillId === skillName)
        : all;
      setTests(filtered);
    } catch {
      setTests([]);
    } finally {
      setLoading(false);
    }
  }, [agentId, skillName]);

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  const handleSave = useCallback(async () => {
    if (!currentPayload) return;
    const name = window.prompt("Name this test case:");
    if (!name?.trim()) return;
    try {
      unwrap(await commands.saveTest(name.trim(), agentId, skillName, JSON.stringify(currentPayload)));
      await loadTests();
    } catch {
      // ignore save failures
    }
  }, [agentId, skillName, currentPayload, loadTests]);

  const handleDelete = useCallback(
    async (testId: string) => {
      try {
        unwrap(await commands.deleteSavedTest(testId));
        setTests((prev) => prev.filter((t) => t.id !== testId));
      } catch {
        // ignore
      }
    },
    []
  );

  if (loading) {
    return (
      <div style={{ padding: 8, fontSize: 11, color: "var(--text-muted)" }}>
        Loading saved tests...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {/* Saved test chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {tests.map((test) => (
          <div
            key={test.id}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 8px",
              borderRadius: 10,
              background: "var(--bg-secondary)",
              border: "0.5px solid var(--border-subtle)",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              transition: "background 0.1s, border-color 0.1s",
              maxWidth: 160,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--border-default)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-subtle)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            <span
              onClick={() => onRerun(test.payload)}
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
              }}
              title={`Re-run: ${test.name}`}
            >
              {test.name}
            </span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(test.id);
              }}
              style={{
                color: "var(--text-muted)",
                fontSize: 11,
                cursor: "pointer",
                lineHeight: 1,
                flexShrink: 0,
                transition: "color var(--duration-fast)",
              }}
              title="Delete saved test"
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--dot-error)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
            >
              x
            </span>
          </div>
        ))}

        {tests.length === 0 ? (
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            No saved tests for this skill
          </span>
        ) : null}
      </div>

      {/* Save current button */}
      {currentPayload != null && (
        <button
          onClick={handleSave}
          style={{
            alignSelf: "flex-start",
            padding: "3px 8px",
            fontSize: 11,
            background: "transparent",
            border: "0.5px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Save current
        </button>
      )}
    </div>
  );
}
