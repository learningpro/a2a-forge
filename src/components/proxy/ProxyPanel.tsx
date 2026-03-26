import { useState, useEffect, useCallback } from "react";
import { useProxyStore } from "../../stores/proxyStore";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { EmptyState } from "../shared/EmptyState";

type ProxyTab = "rules" | "recording" | "traffic";

export function ProxyPanel() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const status = useProxyStore((s) => s.status);
  const rules = useProxyStore((s) => s.rules);
  const recordings = useProxyStore((s) => s.recordings);
  const currentRecords = useProxyStore((s) => s.currentRecords);
  const isRecording = useProxyStore((s) => s.isRecording);
  const error = useProxyStore((s) => s.error);

  const [activeTab, setActiveTab] = useState<ProxyTab>("rules");
  const [port, setPort] = useState(9339);

  useEffect(() => {
    useProxyStore.getState().refreshStatus();
    useProxyStore.getState().loadRules(activeWorkspaceId);
    useProxyStore.getState().loadRecordings(activeWorkspaceId);
  }, [activeWorkspaceId]);

  const handleStartProxy = useCallback(async () => {
    await useProxyStore.getState().startProxy(port, activeWorkspaceId);
  }, [port, activeWorkspaceId]);

  const handleStopProxy = useCallback(async () => {
    await useProxyStore.getState().stopProxy();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Proxy header */}
      <div style={{
        padding: "10px 14px", borderBottom: "0.5px solid var(--border-subtle)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
            Local Proxy
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            {status.running ? (
              <span>
                <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--dot-online, #22c55e)", marginRight: 4, verticalAlign: "middle" }} />
                Running on :{status.port}
              </span>
            ) : (
              <span style={{ color: "var(--text-muted)" }}>Stopped</span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {!status.running && (
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              style={{
                width: 60, padding: "3px 6px", fontSize: 11,
                background: "var(--bg-secondary)", border: "0.5px solid var(--border-subtle)",
                borderRadius: "var(--radius-md, 6px)", color: "var(--text-primary)", textAlign: "center",
              }}
            />
          )}
          <button
            onClick={status.running ? handleStopProxy : handleStartProxy}
            style={{
              padding: "5px 14px", fontSize: 11, fontWeight: 500,
              background: "var(--bg-primary)", border: "0.5px solid var(--border-strong)",
              borderRadius: "var(--radius-md, 6px)", color: "var(--text-primary)", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: status.running ? "var(--dot-error, #ef4444)" : "var(--dot-online, #22c55e)",
            }} />
            {status.running ? "Stop" : "Start"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: "6px 14px", fontSize: 11, color: "var(--dot-error, #ef4444)", background: "var(--bg-secondary)" }}>
          {error}
        </div>
      )}

      {/* Sub-tabs */}
      <div style={{ display: "flex", borderBottom: "0.5px solid var(--border-subtle)", flexShrink: 0 }}>
        {(["rules", "recording", "traffic"] as ProxyTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "6px 14px", fontSize: 11, fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? "var(--text-primary)" : "var(--text-muted)",
              background: "transparent", border: "none",
              borderBottom: activeTab === tab ? "2px solid var(--text-primary)" : "2px solid transparent",
              cursor: "pointer", textTransform: "capitalize",
              transition: "color var(--duration-fast), border-color var(--duration-fast)",
            }}
            onMouseEnter={(e) => { if (activeTab !== tab) e.currentTarget.style.color = "var(--text-secondary)"; }}
            onMouseLeave={(e) => { if (activeTab !== tab) e.currentTarget.style.color = "var(--text-muted)"; }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {activeTab === "rules" && <RulesTab workspaceId={activeWorkspaceId} rules={rules} />}
        {activeTab === "recording" && <RecordingTab workspaceId={activeWorkspaceId} recordings={recordings} isRecording={isRecording} />}
        {activeTab === "traffic" && <TrafficTab records={currentRecords} />}
      </div>
    </div>
  );
}

// --- Rules Tab ---
function RulesTab({ workspaceId, rules }: { workspaceId: string; rules: import("../../lib/proxy-commands").InterceptRule[] }) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [matchType, setMatchType] = useState("all");
  const [matchValue, setMatchValue] = useState("");
  const [actionType, setActionType] = useState("delay");
  const [actionJson, setActionJson] = useState('{"delay_ms": 1000}');

  const handleCreate = useCallback(async () => {
    if (!name.trim()) return;
    await useProxyStore.getState().createRule(name, matchType, matchValue, actionType, actionJson, 0, workspaceId);
    setName(""); setShowCreate(false);
  }, [name, matchType, matchValue, actionType, actionJson, workspaceId]);

  const inputStyle = {
    width: "100%", padding: "3px 6px", fontSize: 11,
    background: "var(--bg-secondary)", border: "0.5px solid var(--border-subtle)",
    borderRadius: "var(--radius-md, 6px)", color: "var(--text-primary)", outline: "none",
  };

  return (
    <div>
      <div style={{ padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Intercept Rules
        </span>
        <button onClick={() => setShowCreate(!showCreate)} style={{
          padding: "2px 8px", fontSize: 11, background: "transparent",
          border: "0.5px solid var(--border-subtle)", borderRadius: "var(--radius-md, 6px)",
          color: "var(--text-secondary)", cursor: "pointer",
        }}>+ New</button>
      </div>

      {showCreate && (
        <div style={{ padding: "8px 12px", borderBottom: "0.5px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: 4 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rule name" style={inputStyle} autoFocus />
          <div style={{ display: "flex", gap: 4 }}>
            <select value={matchType} onChange={(e) => setMatchType(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
              <option value="all">Match All</option>
              <option value="agent">Match Agent</option>
              <option value="skill">Match Skill</option>
              <option value="method">Match Method</option>
            </select>
            {matchType !== "all" && (
              <input value={matchValue} onChange={(e) => setMatchValue(e.target.value)} placeholder="Value..." style={{ ...inputStyle, flex: 1 }} />
            )}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <select value={actionType} onChange={(e) => setActionType(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
              <option value="delay">Delay</option>
              <option value="error">Error</option>
              <option value="mock">Mock Response</option>
              <option value="modify_request">Modify Request</option>
              <option value="modify_response">Modify Response</option>
            </select>
          </div>
          <textarea value={actionJson} onChange={(e) => setActionJson(e.target.value)} rows={3}
            style={{ ...inputStyle, fontFamily: "var(--font-mono, monospace)", resize: "vertical" }} />
          <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
            <button onClick={() => setShowCreate(false)} style={{ padding: "3px 10px", fontSize: 11, background: "transparent", border: "0.5px solid var(--border-subtle)", borderRadius: "var(--radius-md, 6px)", color: "var(--text-secondary)", cursor: "pointer" }}>Cancel</button>
            <button onClick={handleCreate} style={{ padding: "3px 10px", fontSize: 11, background: "transparent", border: "0.5px solid var(--border-strong)", borderRadius: "var(--radius-md, 6px)", color: "var(--text-primary)", cursor: "pointer", fontWeight: 500 }}>Create</button>
          </div>
        </div>
      )}

      {rules.length === 0 && !showCreate && (
        <EmptyState
          icon="proxy"
          title="No intercept rules"
          description="Create a rule to modify, delay, or mock requests passing through the proxy."
          action={{ label: "+ New rule", onClick: () => setShowCreate(true) }}
        />
      )}

      {rules.map((rule) => (
        <div key={rule.id} style={{
          padding: "8px 12px", borderBottom: "0.5px solid var(--border-subtle)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          opacity: rule.enabled ? 1 : 0.5,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-primary)" }}>{rule.name}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
              {rule.matchType === "all" ? "All requests" : `${rule.matchType}: ${rule.matchValue}`} → {rule.actionType}
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
            <button
              onClick={() => useProxyStore.getState().toggleRule(rule.id, !rule.enabled)}
              style={{ padding: "2px 6px", fontSize: 11, background: "transparent", border: "0.5px solid var(--border-subtle)", borderRadius: "var(--radius-md, 6px)", color: "var(--text-secondary)", cursor: "pointer" }}
            >
              {rule.enabled ? "Disable" : "Enable"}
            </button>
            <button
              onClick={() => useProxyStore.getState().deleteRule(rule.id)}
              style={{ padding: "2px 4px", fontSize: 11, background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
            >×</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Recording Tab ---
function RecordingTab({ workspaceId, recordings, isRecording }: { workspaceId: string; recordings: import("../../lib/proxy-commands").RecordingSession[]; isRecording: boolean }) {
  const [sessionName, setSessionName] = useState("");

  const handleStart = useCallback(async () => {
    if (!sessionName.trim()) return;
    await useProxyStore.getState().startRecording(sessionName.trim());
    setSessionName("");
  }, [sessionName]);

  const handleStop = useCallback(async () => {
    await useProxyStore.getState().stopRecording();
    useProxyStore.getState().loadRecordings(workspaceId);
  }, [workspaceId]);

  return (
    <div>
      <div style={{ padding: "8px 12px", borderBottom: "0.5px solid var(--border-subtle)" }}>
        {isRecording ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--dot-error)", animation: "pulse 1s infinite" }} />
            <span style={{ fontSize: 11, color: "var(--text-primary)" }}>Recording...</span>
            <button onClick={handleStop} style={{
              padding: "3px 10px", fontSize: 11, background: "transparent",
              border: "0.5px solid var(--border-strong)", borderRadius: "var(--radius-md, 6px)",
              color: "var(--text-primary)", cursor: "pointer", fontWeight: 500, marginLeft: "auto",
            }}>Stop</button>
            <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 4 }}>
            <input
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleStart(); }}
              placeholder="Session name..."
              style={{
                flex: 1, padding: "3px 6px", fontSize: 11,
                background: "var(--bg-secondary)", border: "0.5px solid var(--border-subtle)",
                borderRadius: "var(--radius-md, 6px)", color: "var(--text-primary)", outline: "none",
              }}
            />
            <button onClick={handleStart} disabled={!sessionName.trim()} style={{
              padding: "3px 10px", fontSize: 11, background: "transparent",
              border: "0.5px solid var(--border-strong)", borderRadius: "var(--radius-md, 6px)",
              color: "var(--text-primary)", cursor: sessionName.trim() ? "pointer" : "default",
              fontWeight: 500, opacity: sessionName.trim() ? 1 : 0.5,
            }}>Record</button>
          </div>
        )}
      </div>

      {recordings.length === 0 && (
        <div style={{ padding: 16, textAlign: "center", color: "var(--text-muted)", fontSize: 11 }}>
          No recordings yet. Start the proxy and record traffic.
        </div>
      )}

      {recordings.map((rec) => (
        <div key={rec.name} style={{
          padding: "8px 12px", borderBottom: "0.5px solid var(--border-subtle)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-primary)" }}>{rec.name}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{rec.count} request{rec.count !== 1 ? "s" : ""}</div>
          </div>
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <button onClick={() => useProxyStore.getState().viewRecording(rec.name, workspaceId)}
              style={{ padding: "2px 6px", fontSize: 11, background: "transparent", border: "0.5px solid var(--border-subtle)", borderRadius: "var(--radius-md, 6px)", color: "var(--text-secondary)", cursor: "pointer" }}>
              View
            </button>
            <button onClick={() => useProxyStore.getState().replayRecording(rec.name, workspaceId)}
              style={{ padding: "2px 6px", fontSize: 11, background: "transparent", border: "0.5px solid var(--border-subtle)", borderRadius: "var(--radius-md, 6px)", color: "var(--text-secondary)", cursor: "pointer" }}>
              Replay
            </button>
            <button onClick={() => useProxyStore.getState().deleteRecording(rec.name, workspaceId)}
              style={{ padding: "2px 4px", fontSize: 11, background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Traffic Tab ---
function TrafficTab({ records }: { records: import("../../lib/proxy-commands").TrafficRecord[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (records.length === 0) {
    return (
      <div style={{ padding: 16, textAlign: "center", color: "var(--text-muted)", fontSize: 11 }}>
        No traffic records. View or replay a recording session to see traffic here.
      </div>
    );
  }

  return (
    <div>
      {records.map((rec) => (
        <div key={rec.id} style={{ borderBottom: "0.5px solid var(--border-subtle)" }}>
          <div
            onClick={() => setExpandedId(expandedId === rec.id ? null : rec.id)}
            style={{
              padding: "6px 12px", cursor: "pointer",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <StatusDot code={rec.statusCode} />
              <span style={{ fontSize: 11, color: "var(--text-primary)" }}>
                {rec.skillName ?? "unknown"}
              </span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {rec.agentId?.slice(0, 8)}
              </span>
            </div>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {rec.durationMs != null ? `${rec.durationMs}ms` : ""}
            </span>
          </div>
          {expandedId === rec.id && (
            <div style={{ padding: "4px 12px 8px", fontSize: 11, fontFamily: "var(--font-mono, monospace)" }}>
              <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>Request:</div>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all", color: "var(--text-secondary)", maxHeight: 150, overflow: "auto" }}>
                {formatJson(rec.requestJson)}
              </pre>
              {rec.responseJson && (
                <>
                  <div style={{ color: "var(--text-muted)", marginTop: 8, marginBottom: 4 }}>Response:</div>
                  <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all", color: "var(--text-secondary)", maxHeight: 150, overflow: "auto" }}>
                    {formatJson(rec.responseJson)}
                  </pre>
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function StatusDot({ code }: { code: number | null }) {
  const color = code == null ? "var(--text-muted)"
    : code < 300 ? "var(--dot-online, #22c55e)"
    : code < 500 ? "var(--dot-warning, #f59e0b)"
    : "var(--dot-error, #ef4444)";
  return (
    <span style={{
      display: "inline-block", width: 6, height: 6, borderRadius: "50%",
      background: color, flexShrink: 0,
    }} />
  );
}

function formatJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}
