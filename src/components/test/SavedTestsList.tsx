import { useState, useEffect, useCallback, useRef } from "react";
import { commands } from "../../bindings";
import { unwrap, type SavedTest } from "../../lib/tauri-helpers";
import { useT } from "../../lib/i18n";

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
  const [tests, setTests] = useState<SavedTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [naming, setNaming] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const { t } = useT();

  const loadTests = useCallback(async () => {
    setLoading(true);
    try {
      const all = unwrap(await commands.listSavedTests(agentId, skillName)) as SavedTest[];
      setTests(all);
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
    if (!naming) {
      setNaming(true);
      setNameInput("");
      setTimeout(() => nameRef.current?.focus(), 50);
      return;
    }
    if (!nameInput.trim()) return;
    try {
      unwrap(await commands.saveTest(nameInput.trim(), agentId, skillName, JSON.stringify(currentPayload)));
      setNaming(false);
      setNameInput("");
      await loadTests();
    } catch {
      // ignore save failures
    }
  }, [agentId, skillName, currentPayload, loadTests, naming, nameInput]);

  const handleRerun = useCallback((test: SavedTest) => {
    try {
      const parsed = JSON.parse(test.requestJson);
      onRerun(parsed);
    } catch {
      onRerun(null);
    }
  }, [onRerun]);

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
        {t("test.loading")}
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
              onClick={() => handleRerun(test)}
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
              title={t("action.delete")}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--dot-error)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
            >
              x
            </span>
          </div>
        ))}

        {tests.length === 0 ? (
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {t("test.noSavedTests")}
          </span>
        ) : null}
      </div>

      {/* Inline name input for saving */}
      {naming && (
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <input
            ref={nameRef}
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") { setNaming(false); setNameInput(""); }
            }}
            placeholder={t("test.testNamePlaceholder")}
            style={{
              flex: 1,
              padding: "3px 6px",
              fontSize: 11,
              background: "var(--bg-secondary)",
              border: "0.5px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-primary)",
              fontFamily: "inherit",
              outline: "none",
            }}
          />
          <button
            onClick={handleSave}
            style={{
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
            {t("action.save")}
          </button>
          <button
            onClick={() => { setNaming(false); setNameInput(""); }}
            style={{
              padding: "3px 8px",
              fontSize: 11,
              background: "transparent",
              border: "0.5px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {t("action.cancel")}
          </button>
        </div>
      )}

      {/* Save current button */}
      {currentPayload != null && !naming && (
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
          {t("test.saveCurrent")}
        </button>
      )}
    </div>
  );
}
