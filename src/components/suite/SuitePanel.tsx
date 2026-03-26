import { useEffect } from "react";
import { useSuiteStore } from "../../stores/suiteStore";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { SuiteList } from "./SuiteList";
import { SuiteEditor } from "./SuiteEditor";
import { SuiteRunViewer } from "./SuiteRunViewer";

export function SuitePanel() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const selectedSuiteId = useSuiteStore((s) => s.selectedSuiteId);

  useEffect(() => {
    useSuiteStore.getState().loadSuites(activeWorkspaceId);
  }, [activeWorkspaceId]);

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Left: suite list */}
      <div style={{
        width: 200, minWidth: 160, borderRight: "0.5px solid var(--border-subtle)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <SuiteList workspaceId={activeWorkspaceId} />
      </div>

      {/* Right: editor + run viewer */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {selectedSuiteId ? (
          <>
            {/* Top: suite editor */}
            <div style={{ flex: 1, overflow: "auto", borderBottom: "0.5px solid var(--border-subtle)" }}>
              <SuiteEditor suiteId={selectedSuiteId} />
            </div>
            {/* Bottom: run results */}
            <div style={{ flex: 1, overflow: "auto" }}>
              <SuiteRunViewer />
            </div>
          </>
        ) : (
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--text-muted)", fontSize: 11, lineHeight: 1.6, textAlign: "center", padding: 20,
          }}>
            Select or create a test suite to get started.
            <br />
            Suites let you group test cases into automated sequences.
          </div>
        )}
      </div>
    </div>
  );
}
