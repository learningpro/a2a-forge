import { useMemo, useCallback } from "react";
import { useSuiteStore } from "../../stores/suiteStore";
import { useT } from "../../lib/i18n";
import type { AssertionResult } from "../../lib/suite-commands";

export function SuiteRunViewer() {
  const currentRunDetail = useSuiteStore((s) => s.currentRunDetail);
  const steps = useSuiteStore((s) => s.steps);
  const isRunning = useSuiteStore((s) => s.isRunning);
  const runHistory = useSuiteStore((s) => s.runHistory);
  const { t } = useT();

  const handleExport = useCallback(async (format: string) => {
    if (!currentRunDetail) return;
    try {
      const content = await useSuiteStore.getState().exportReport(currentRunDetail.run.id, format);
      if (format === "html") {
        const blob = new Blob([content], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        // Revoke after a short delay to allow the new tab to load
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      } else {
        await navigator.clipboard.writeText(content);
      }
    } catch (err) {
      console.error("Export failed:", err);
    }
  }, [currentRunDetail]);

  const handleViewRun = useCallback((runId: string) => {
    useSuiteStore.getState().loadRunDetail(runId);
  }, []);

  const handleRerun = useCallback(async () => {
    if (!currentRunDetail) return;
    await useSuiteStore.getState().runSuite(currentRunDetail.run.suiteId);
  }, [currentRunDetail]);

  // Map step IDs to names
  const stepNames = useMemo(() => {
    const map: Record<string, string> = {};
    steps.forEach((s) => { map[s.id] = s.name; });
    return map;
  }, [steps]);

  if (isRunning) {
    return (
      <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 11 }}>
        <div style={{ marginBottom: 8 }}>{t("suite.runningSuiteStatus")}</div>
        <div style={{
          width: 20, height: 20, border: "2px solid var(--border-subtle)",
          borderTopColor: "var(--text-primary)", borderRadius: "50%",
          animation: "a2a-spin 0.8s linear infinite", margin: "0 auto",
        }} />
      </div>
    );
  }

  if (!currentRunDetail) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 11, lineHeight: 1.6 }}>
            {t("suite.runResults")}
          </div>
        </div>
        {/* Run history */}
        {runHistory.length > 0 && (
          <div style={{ borderTop: "0.5px solid var(--border-subtle)", maxHeight: 200, overflow: "auto" }}>
            <div style={{
              fontSize: 11, fontWeight: 500, color: "var(--text-muted)",
              textTransform: "uppercase", letterSpacing: "0.07em", padding: "8px 12px 4px",
            }}>
              {t("suite.runHistory")}
            </div>
            {runHistory.map((run) => (
              <div
                key={run.id}
                onClick={() => handleViewRun(run.id)}
                style={{
                  padding: "6px 12px", cursor: "pointer", fontSize: 11,
                  borderBottom: "0.5px solid var(--border-subtle)",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}
              >
                <span>
                  <StatusIcon status={run.status} />
                  {" "}{run.passedSteps}/{run.totalSteps} {t("suite.passed")}
                </span>
                <span style={{ color: "var(--text-muted)" }}>
                  {run.durationMs}ms · {run.startedAt.slice(0, 16)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const { run, stepResults } = currentRunDetail;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "auto" }}>
      {/* Run summary */}
      <div style={{
        padding: "10px 14px",
        borderBottom: "0.5px solid var(--border-subtle)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
            <StatusIcon status={run.status} />
            {" "}{run.status.toUpperCase()} — {run.passedSteps}/{run.totalSteps} {t("suite.passed")}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            {run.durationMs}ms · {run.startedAt.slice(0, 16)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => handleExport("json")} style={exportBtnStyle} title="Copy JSON to clipboard">
            JSON
          </button>
          <button onClick={() => handleExport("html")} style={exportBtnStyle} title="Open HTML report">
            HTML
          </button>
          <button onClick={handleRerun} style={{
            ...exportBtnStyle, borderColor: "var(--border-strong)", fontWeight: 500,
          }}>
            {t("suite.rerun")}
          </button>
        </div>
      </div>

      {/* Step results */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {stepResults.map((sr) => {
          const stepName = stepNames[sr.stepId] ?? sr.stepId;
          const assertionResults: AssertionResult[] = sr.assertionResultsJson
            ? (() => { try { return JSON.parse(sr.assertionResultsJson); } catch { return []; } })()
            : [];

          return (
            <div key={sr.id} style={{
              padding: "8px 14px",
              borderBottom: "0.5px solid var(--border-subtle)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-primary)" }}>
                  <StatusIcon status={sr.status} /> {stepName}
                </div>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{sr.durationMs}ms</span>
              </div>

              {/* Assertion results */}
              {assertionResults.map((ar, i) => (
                <div key={i} style={{
                  padding: "2px 0 2px 16px", fontSize: 11,
                  color: ar.passed ? "var(--dot-online, #22c55e)" : "var(--dot-error, #ef4444)",
                }}>
                  {ar.passed ? "\u2705" : "\u274C"} {ar.message}
                  {!ar.passed && ar.actual && (
                    <span style={{ color: "var(--text-muted)", marginLeft: 4 }}>
                      ({t("suite.got")} {ar.actual})
                    </span>
                  )}
                </div>
              ))}

              {/* Error message */}
              {sr.errorMessage && (
                <div style={{
                  padding: "2px 0 2px 16px", fontSize: 11,
                  color: "var(--dot-error, #ef4444)",
                }}>
                  {t("suite.error")} {sr.errorMessage}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Run history */}
      {runHistory.length > 1 && (
        <div style={{ borderTop: "0.5px solid var(--border-subtle)", maxHeight: 150, overflow: "auto" }}>
          <div style={{
            fontSize: 11, fontWeight: 500, color: "var(--text-muted)",
            textTransform: "uppercase", letterSpacing: "0.07em", padding: "8px 12px 4px",
          }}>
            {t("suite.previousRuns")}
          </div>
          {runHistory.filter((r) => r.id !== run.id).map((r) => (
            <div
              key={r.id}
              onClick={() => handleViewRun(r.id)}
              style={{
                padding: "4px 12px", cursor: "pointer", fontSize: 11,
                borderBottom: "0.5px solid var(--border-subtle)",
                display: "flex", justifyContent: "space-between",
              }}
            >
              <span><StatusIcon status={r.status} /> {r.passedSteps}/{r.totalSteps}</span>
              <span style={{ color: "var(--text-muted)" }}>{r.durationMs}ms</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  const color = status === "passed" ? "var(--dot-online, #22c55e)"
    : status === "failed" ? "var(--dot-error, #ef4444)"
    : "var(--dot-warning, #f59e0b)";
  return (
    <span style={{
      display: "inline-block", width: 6, height: 6, borderRadius: "50%",
      background: color, marginRight: 4, verticalAlign: "middle",
    }} />
  );
}

const exportBtnStyle: React.CSSProperties = {
  padding: "3px 8px", fontSize: 11, background: "transparent",
  border: "0.5px solid var(--border-subtle)", borderRadius: "var(--radius-md, 6px)",
  color: "var(--text-secondary)", cursor: "pointer",
};
