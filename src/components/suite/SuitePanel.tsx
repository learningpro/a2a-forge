import { useEffect } from "react";
import { useSuiteStore } from "../../stores/suiteStore";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { SuiteList } from "./SuiteList";
import { SuiteEditor } from "./SuiteEditor";
import { SuiteRunViewer } from "./SuiteRunViewer";
import { EmptyState } from "../shared/EmptyState";
import { useT } from "../../lib/i18n";

export function SuitePanel() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const selectedSuiteId = useSuiteStore((s) => s.selectedSuiteId);
  const { t } = useT();

  useEffect(() => {
    useSuiteStore.getState().selectSuite(null);
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
          }}>
            <EmptyState
              icon="suite"
              title={t("empty.selectSuite")}
              description={t("empty.selectSuiteDesc")}
            />
          </div>
        )}
      </div>
    </div>
  );
}
