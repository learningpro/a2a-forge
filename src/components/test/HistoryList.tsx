import { useState, useEffect, useCallback, useRef } from "react";
import { commands } from "../../bindings";
import { unwrap, type HistoryEntry } from "../../lib/tauri-helpers";

interface HistoryListProps {
  agentId: string | null;
  onSelectHistory?: (entry: HistoryEntry) => void;
}

function formatTime(epochMs: number): string {
  const diff = Date.now() - epochMs;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(epochMs).toLocaleDateString();
}

const statusDotColor: Record<string, string> = {
  completed: "var(--dot-online)",
  failed: "var(--dot-error)",
  running: "var(--dot-warning)",
  canceled: "var(--text-muted)",
};

export function HistoryList({ agentId, onSelectHistory }: HistoryListProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadHistory = useCallback(async (searchQuery?: string) => {
    setLoading(true);
    try {
      const all = unwrap(await commands.listHistory(agentId, null, null)) as unknown as HistoryEntry[];
      let filtered: HistoryEntry[] = all;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = all.filter((e: HistoryEntry) => {
          const reqStr = e.requestJson;
          return reqStr.toLowerCase().includes(q) || e.id.toLowerCase().includes(q);
        });
      }
      setEntries(filtered);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        loadHistory(value);
      }, 300);
    },
    [loadHistory]
  );

  const handleClear = useCallback(async () => {
    const label = agentId ? "this agent" : "all agents";
    if (!window.confirm(`Clear history for ${label}?`)) return;
    try {
      unwrap(await commands.clearHistory(agentId ?? null));
      setEntries([]);
    } catch {
      // ignore
    }
  }, [agentId]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Search */}
      <div style={{ padding: "8px 12px" }}>
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search history..."
          style={{
            width: "100%",
            padding: "5px 8px",
            fontSize: 11,
            background: "var(--bg-secondary)",
            border: "0.5px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            color: "var(--text-primary)",
            fontFamily: "inherit",
            outline: "none",
          }}
        />
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
        {loading && (
          <div style={{ padding: 12, color: "var(--text-muted)", fontSize: 11, textAlign: "center" }}>
            Loading...
          </div>
        )}

        {!loading && entries.length === 0 && (
          <div style={{ padding: 24, color: "var(--text-muted)", fontSize: 11, textAlign: "center" }}>
            No test history yet
          </div>
        )}

        {entries.map((entry) => (
          <div
            key={entry.id}
            onClick={() => onSelectHistory?.(entry)}
            style={{
              padding: "8px 10px",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "background 0.1s",
              borderBottom: "0.5px solid var(--border-subtle)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-secondary)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: statusDotColor[entry.status] ?? "var(--text-muted)",
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {entry.skillName}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  display: "flex",
                  gap: 6,
                  marginTop: 2,
                }}
              >
                <span>{formatTime(entry.createdAt)}</span>
                {entry.durationMs != null && <span>{entry.durationMs}ms</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Clear button */}
      {entries.length > 0 && (
        <div style={{ padding: "8px 12px", borderTop: "0.5px solid var(--border-subtle)" }}>
          <button
            onClick={handleClear}
            style={{
              width: "100%",
              padding: "5px 10px",
              fontSize: 10,
              background: "transparent",
              border: "0.5px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {agentId ? "Clear history" : "Clear all history"}
          </button>
        </div>
      )}
    </div>
  );
}
