import { useState, useEffect, useCallback } from "react";
import { useWorkspaceAdvancedStore } from "../../stores/workspaceAdvancedStore";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { useAgentStore } from "../../stores/agentStore";

type WsTab = "env" | "chains" | "diff" | "export";

export function WorkspacePanel() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const [activeTab, setActiveTab] = useState<WsTab>("env");

  useEffect(() => {
    useWorkspaceAdvancedStore.getState().loadEnvVars(activeWorkspaceId);
    useWorkspaceAdvancedStore.getState().loadChains(activeWorkspaceId);
  }, [activeWorkspaceId]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ display: "flex", borderBottom: "0.5px solid var(--border-subtle)", flexShrink: 0 }}>
        {(["env", "chains", "diff", "export"] as WsTab[]).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
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
            {tab === "env" ? "Variables" : tab === "chains" ? "Chains" : tab === "diff" ? "Diff" : "Export"}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        {activeTab === "env" && <EnvVarsTab workspaceId={activeWorkspaceId} />}
        {activeTab === "chains" && <ChainsTab workspaceId={activeWorkspaceId} />}
        {activeTab === "diff" && <DiffTab />}
        {activeTab === "export" && <ExportTab workspaceId={activeWorkspaceId} />}
      </div>
    </div>
  );
}

// --- Env Variables ---
function EnvVarsTab({ workspaceId }: { workspaceId: string }) {
  const envVars = useWorkspaceAdvancedStore((s) => s.envVars);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [isSecret, setIsSecret] = useState(false);

  const handleAdd = useCallback(async () => {
    if (!name.trim()) return;
    await useWorkspaceAdvancedStore.getState().setEnvVar(workspaceId, name.trim(), value, isSecret);
    setName(""); setValue(""); setIsSecret(false);
  }, [name, value, isSecret, workspaceId]);

  const inputStyle: React.CSSProperties = {
    padding: "3px 6px", fontSize: 11, background: "var(--bg-secondary)",
    border: "0.5px solid var(--border-subtle)", borderRadius: "var(--radius-md, 6px)",
    color: "var(--text-primary)", outline: "none",
  };

  return (
    <div>
      <div style={{ padding: "8px 12px", borderBottom: "0.5px solid var(--border-subtle)" }}>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="VAR_NAME" style={{ ...inputStyle, flex: 1, fontFamily: "var(--font-mono, monospace)" }} />
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="value" type={isSecret ? "password" : "text"} style={{ ...inputStyle, flex: 2 }} />
          <label style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 2, cursor: "pointer" }}>
            <input type="checkbox" checked={isSecret} onChange={(e) => setIsSecret(e.target.checked)} /> Secret
          </label>
          <button onClick={handleAdd} style={{
            padding: "3px 10px", fontSize: 11, background: "transparent",
            border: "0.5px solid var(--border-strong)", borderRadius: "var(--radius-md, 6px)",
            color: "var(--text-primary)", cursor: "pointer", fontWeight: 500,
          }}>Add</button>
        </div>
      </div>
      {envVars.length === 0 && (
        <div style={{ padding: 16, textAlign: "center", color: "var(--text-muted)", fontSize: 11 }}>
          No environment variables. Add variables to use {"{{VAR_NAME}}"} substitution in request chains.
        </div>
      )}
      {envVars.map((v) => (
        <div key={v.id} style={{
          padding: "6px 12px", borderBottom: "0.5px solid var(--border-subtle)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 11, fontFamily: "var(--font-mono, monospace)", color: "var(--text-primary)", fontWeight: 500 }}>{v.name}</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{v.isSecret ? "********" : v.value}</span>
            {v.isSecret && <span style={{ fontSize: 11, padding: "1px 4px", background: "var(--bg-secondary)", borderRadius: 4, color: "var(--text-muted)" }}>secret</span>}
          </div>
          <button onClick={() => useWorkspaceAdvancedStore.getState().deleteEnvVar(v.id)} style={{
            padding: "2px 4px", fontSize: 11, background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer",
          }}>x</button>
        </div>
      ))}
    </div>
  );
}

// --- Chains ---
function ChainsTab({ workspaceId }: { workspaceId: string }) {
  const chains = useWorkspaceAdvancedStore((s) => s.chains);
  const selectedChainId = useWorkspaceAdvancedStore((s) => s.selectedChainId);
  const chainSteps = useWorkspaceAdvancedStore((s) => s.chainSteps);
  const chainRunResult = useWorkspaceAdvancedStore((s) => s.chainRunResult);
  const isRunningChain = useWorkspaceAdvancedStore((s) => s.isRunningChain);
  const agents = useAgentStore((s) => s.agents);
  const [newName, setNewName] = useState("");
  const [showAddStep, setShowAddStep] = useState(false);
  const [stepName, setStepName] = useState("");
  const [stepAgentId, setStepAgentId] = useState("");
  const [stepSkill, setStepSkill] = useState("");
  const [stepRequest, setStepRequest] = useState('{"prompt": ""}');
  const [stepExtract, setStepExtract] = useState("{}");

  const handleCreateChain = useCallback(async () => {
    if (!newName.trim()) return;
    const chain = await useWorkspaceAdvancedStore.getState().createChain(newName.trim(), "", workspaceId);
    useWorkspaceAdvancedStore.getState().selectChain(chain.id);
    setNewName("");
  }, [newName, workspaceId]);

  const handleAddStep = useCallback(async () => {
    if (!selectedChainId || !stepName.trim() || !stepAgentId || !stepSkill) return;
    await useWorkspaceAdvancedStore.getState().addChainStep(selectedChainId, stepName, stepAgentId, stepSkill, stepRequest, stepExtract);
    setStepName(""); setStepRequest('{"prompt": ""}'); setStepExtract("{}"); setShowAddStep(false);
  }, [selectedChainId, stepName, stepAgentId, stepSkill, stepRequest, stepExtract]);

  const selectedAgent = agents.find((a) => a.id === stepAgentId);
  const skills = selectedAgent?.card.skills ?? [];

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "3px 6px", fontSize: 11, background: "var(--bg-secondary)",
    border: "0.5px solid var(--border-subtle)", borderRadius: "var(--radius-md, 6px)",
    color: "var(--text-primary)", outline: "none",
  };

  return (
    <div style={{ display: "flex", height: "100%" }}>
      {/* Chain list */}
      <div style={{ width: 180, borderRight: "0.5px solid var(--border-subtle)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "6px 8px", borderBottom: "0.5px solid var(--border-subtle)", display: "flex", gap: 4 }}>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleCreateChain(); }}
            placeholder="New chain..." style={{ ...inputStyle, flex: 1 }} />
          <button onClick={handleCreateChain} style={{ padding: "2px 6px", fontSize: 11, background: "transparent", border: "0.5px solid var(--border-subtle)", borderRadius: "var(--radius-md, 6px)", color: "var(--text-secondary)", cursor: "pointer" }}>+</button>
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          {chains.map((c) => (
            <div key={c.id} onClick={() => useWorkspaceAdvancedStore.getState().selectChain(c.id)} style={{
              padding: "6px 8px", cursor: "pointer", fontSize: 11, color: "var(--text-primary)",
              background: c.id === selectedChainId ? "var(--bg-secondary)" : "transparent",
              borderBottom: "0.5px solid var(--border-subtle)",
              display: "flex", justifyContent: "space-between",
            }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
              <button onClick={(e) => { e.stopPropagation(); useWorkspaceAdvancedStore.getState().deleteChain(c.id); }}
                style={{ padding: "0 2px", fontSize: 11, background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>x</button>
            </div>
          ))}
        </div>
      </div>

      {/* Chain detail */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
        {!selectedChainId ? (
          <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 11 }}>
            Select or create a chain. Chains pipe the output of one skill into the next using {"{{variable}}"} substitution.
          </div>
        ) : (
          <>
            <div style={{ padding: "8px 12px", borderBottom: "0.5px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Steps</span>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => setShowAddStep(!showAddStep)} style={{ padding: "2px 8px", fontSize: 11, background: "transparent", border: "0.5px solid var(--border-subtle)", borderRadius: "var(--radius-md, 6px)", color: "var(--text-secondary)", cursor: "pointer" }}>+ Step</button>
                <button onClick={() => useWorkspaceAdvancedStore.getState().runChain(selectedChainId)} disabled={isRunningChain || chainSteps.length === 0}
                  style={{ padding: "2px 8px", fontSize: 11, fontWeight: 500, background: "transparent", border: "0.5px solid var(--border-strong)", borderRadius: "var(--radius-md, 6px)", color: "var(--text-primary)", cursor: isRunningChain ? "default" : "pointer", opacity: isRunningChain || chainSteps.length === 0 ? 0.5 : 1 }}>
                  {isRunningChain ? "Running..." : "Run"}
                </button>
              </div>
            </div>

            {showAddStep && (
              <div style={{ padding: "8px 12px", borderBottom: "0.5px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: 4 }}>
                <input value={stepName} onChange={(e) => setStepName(e.target.value)} placeholder="Step name" style={inputStyle} />
                <div style={{ display: "flex", gap: 4 }}>
                  <select value={stepAgentId} onChange={(e) => { setStepAgentId(e.target.value); setStepSkill(""); }} style={{ ...inputStyle, flex: 1 }}>
                    <option value="">Agent...</option>
                    {agents.map((a) => <option key={a.id} value={a.id}>{a.nickname || a.card.name}</option>)}
                  </select>
                  <select value={stepSkill} onChange={(e) => setStepSkill(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                    <option value="">Skill...</option>
                    {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <textarea value={stepRequest} onChange={(e) => setStepRequest(e.target.value)} rows={3} placeholder="Request JSON (use {{var}} for substitution)"
                  style={{ ...inputStyle, fontFamily: "var(--font-mono, monospace)", resize: "vertical" }} />
                <textarea value={stepExtract} onChange={(e) => setStepExtract(e.target.value)} rows={2} placeholder='Extract: {"varName": "$.result.url"}'
                  style={{ ...inputStyle, fontFamily: "var(--font-mono, monospace)", resize: "vertical" }} />
                <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                  <button onClick={() => setShowAddStep(false)} style={{ padding: "3px 8px", fontSize: 11, background: "transparent", border: "0.5px solid var(--border-subtle)", borderRadius: "var(--radius-md, 6px)", color: "var(--text-secondary)", cursor: "pointer" }}>Cancel</button>
                  <button onClick={handleAddStep} style={{ padding: "3px 8px", fontSize: 11, fontWeight: 500, background: "transparent", border: "0.5px solid var(--border-strong)", borderRadius: "var(--radius-md, 6px)", color: "var(--text-primary)", cursor: "pointer" }}>Add</button>
                </div>
              </div>
            )}

            {chainSteps.map((step, i) => {
              const agent = agents.find((a) => a.id === step.agentId);
              const runStep = chainRunResult?.steps[i];
              return (
                <div key={step.id} style={{ padding: "6px 12px", borderBottom: "0.5px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-primary)" }}>
                      {runStep && <StatusDot status={runStep.status} />} {i + 1}. {step.name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {agent?.nickname || agent?.card.name} · {step.skillName}
                      {runStep && <span> · {runStep.durationMs}ms</span>}
                    </div>
                    {runStep?.error && <div style={{ fontSize: 11, color: "var(--dot-error, #ef4444)" }}>{runStep.error}</div>}
                    {runStep && Object.keys(runStep.extracted).length > 0 && (
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        Extracted: {Object.entries(runStep.extracted).map(([k, v]) => `${k}=${v.slice(0, 30)}`).join(", ")}
                      </div>
                    )}
                  </div>
                  <button onClick={() => useWorkspaceAdvancedStore.getState().deleteChainStep(step.id)}
                    style={{ padding: "2px 4px", fontSize: 11, background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>x</button>
                </div>
              );
            })}

            {chainRunResult && (
              <div style={{ padding: "8px 12px", background: "var(--bg-secondary)", fontSize: 11 }}>
                <span style={{ fontWeight: 500 }}>
                  <StatusDot status={chainRunResult.status} /> {chainRunResult.status.toUpperCase()}
                </span>
                <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>{chainRunResult.durationMs}ms</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// --- Diff ---
function DiffTab() {
  const diffResult = useWorkspaceAdvancedStore((s) => s.diffResult);
  const [responseA, setResponseA] = useState("");
  const [responseB, setResponseB] = useState("");

  const handleDiff = useCallback(async () => {
    if (!responseA.trim() || !responseB.trim()) return;
    await useWorkspaceAdvancedStore.getState().diffResponses(responseA, responseB);
  }, [responseA, responseB]);

  const textareaStyle: React.CSSProperties = {
    width: "100%", padding: "6px 8px", fontSize: 11, background: "var(--bg-secondary)",
    border: "0.5px solid var(--border-subtle)", borderRadius: "var(--radius-md, 6px)",
    color: "var(--text-primary)", fontFamily: "var(--font-mono, monospace)", resize: "vertical", outline: "none",
  };

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", marginBottom: 4 }}>Response A</div>
          <textarea value={responseA} onChange={(e) => setResponseA(e.target.value)} rows={6} style={textareaStyle} placeholder="Paste JSON response..." />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", marginBottom: 4 }}>Response B</div>
          <textarea value={responseB} onChange={(e) => setResponseB(e.target.value)} rows={6} style={textareaStyle} placeholder="Paste JSON response..." />
        </div>
      </div>
      <button onClick={handleDiff} style={{
        padding: "5px 14px", fontSize: 11, fontWeight: 500, background: "var(--bg-primary)",
        border: "0.5px solid var(--border-strong)", borderRadius: "var(--radius-md, 6px)",
        color: "var(--text-primary)", cursor: "pointer", alignSelf: "flex-start",
      }}>Compare</button>

      {diffResult && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: diffResult.identical ? "var(--dot-online, #22c55e)" : "var(--text-primary)", marginBottom: 8 }}>
            {diffResult.identical ? "Identical" : `${diffResult.changed.length} changed, ${diffResult.added.length} added, ${diffResult.removed.length} removed`}
          </div>
          {diffResult.changed.map((c, i) => (
            <div key={i} style={{ padding: "4px 0", fontSize: 11, borderBottom: "0.5px solid var(--border-subtle)" }}>
              <div style={{ fontFamily: "var(--font-mono, monospace)", color: "var(--text-primary)", fontWeight: 500 }}>{c.path}</div>
              <div style={{ color: "var(--dot-error, #ef4444)" }}>- {c.oldValue}</div>
              <div style={{ color: "var(--dot-online, #22c55e)" }}>+ {c.newValue}</div>
            </div>
          ))}
          {diffResult.added.map((p, i) => (
            <div key={`a${i}`} style={{ padding: "2px 0", fontSize: 11, color: "var(--dot-online, #22c55e)", fontFamily: "var(--font-mono, monospace)" }}>+ {p}</div>
          ))}
          {diffResult.removed.map((p, i) => (
            <div key={`r${i}`} style={{ padding: "2px 0", fontSize: 11, color: "var(--dot-error, #ef4444)", fontFamily: "var(--font-mono, monospace)" }}>- {p}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Export/Import ---
function ExportTab({ workspaceId }: { workspaceId: string }) {
  const [exportData, setExportData] = useState("");
  const [importData, setImportData] = useState("");
  const [importResult, setImportResult] = useState("");

  const handleExport = useCallback(async () => {
    const data = await useWorkspaceAdvancedStore.getState().exportWorkspace(workspaceId);
    setExportData(data);
    await navigator.clipboard.writeText(data);
  }, [workspaceId]);

  const handleImport = useCallback(async () => {
    if (!importData.trim()) return;
    const wsId = await useWorkspaceAdvancedStore.getState().importWorkspace(importData);
    setImportResult(`Imported as workspace: ${wsId}`);
    setImportData("");
  }, [importData]);

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Export</div>
        <button onClick={handleExport} style={{
          padding: "5px 14px", fontSize: 11, fontWeight: 500, background: "var(--bg-primary)",
          border: "0.5px solid var(--border-strong)", borderRadius: "var(--radius-md, 6px)",
          color: "var(--text-primary)", cursor: "pointer",
        }}>Export Workspace to Clipboard</button>
        {exportData && (
          <pre style={{ marginTop: 8, padding: 8, fontSize: 11, background: "var(--bg-secondary)", borderRadius: "var(--radius-md, 6px)", maxHeight: 200, overflow: "auto", color: "var(--text-secondary)", fontFamily: "var(--font-mono, monospace)" }}>
            {exportData}
          </pre>
        )}
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Import</div>
        <textarea value={importData} onChange={(e) => setImportData(e.target.value)} rows={4} placeholder="Paste workspace JSON..."
          style={{ width: "100%", padding: "6px 8px", fontSize: 11, background: "var(--bg-secondary)", border: "0.5px solid var(--border-subtle)", borderRadius: "var(--radius-md, 6px)", color: "var(--text-primary)", fontFamily: "var(--font-mono, monospace)", resize: "vertical", outline: "none" }} />
        <button onClick={handleImport} disabled={!importData.trim()} style={{
          marginTop: 4, padding: "5px 14px", fontSize: 11, fontWeight: 500, background: "var(--bg-primary)",
          border: "0.5px solid var(--border-strong)", borderRadius: "var(--radius-md, 6px)",
          color: "var(--text-primary)", cursor: importData.trim() ? "pointer" : "default", opacity: importData.trim() ? 1 : 0.5,
        }}>Import Workspace</button>
        {importResult && <div style={{ marginTop: 4, fontSize: 11, color: "var(--dot-online, #22c55e)" }}>{importResult}</div>}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = status === "completed" ? "var(--dot-online, #22c55e)" : status === "failed" ? "var(--dot-error, #ef4444)" : "var(--dot-warning, #f59e0b)";
  return <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: color, marginRight: 4, verticalAlign: "middle" }} />;
}
