import { useState, useEffect, useCallback } from "react";
import { useCommunityStore } from "../../stores/communityStore";
import { useAgentStore } from "../../stores/agentStore";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { EmptyState } from "../shared/EmptyState";

type CommunityTab = "directory" | "favorites" | "health";

export function CommunityPanel() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const [activeTab, setActiveTab] = useState<CommunityTab>("directory");

  useEffect(() => {
    useCommunityStore.getState().searchCommunity();
    useCommunityStore.getState().loadFavorites();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Sub-tabs */}
      <div style={{ display: "flex", borderBottom: "0.5px solid var(--border-subtle)", flexShrink: 0 }}>
        {(["directory", "favorites", "health"] as CommunityTab[]).map((tab) => (
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

      <div style={{ flex: 1, overflow: "auto" }}>
        {activeTab === "directory" && <DirectoryTab />}
        {activeTab === "favorites" && <FavoritesTab />}
        {activeTab === "health" && <HealthTab workspaceId={activeWorkspaceId} />}
      </div>
    </div>
  );
}

// --- Directory Tab ---
function DirectoryTab() {
  const communityAgents = useCommunityStore((s) => s.communityAgents);
  const agents = useAgentStore((s) => s.agents);
  const [search, setSearch] = useState("");

  const handleSearch = useCallback(() => {
    useCommunityStore.getState().searchCommunity(search || undefined);
  }, [search]);

  const handleSubmit = useCallback(async (agentId: string) => {
    await useCommunityStore.getState().submitAgent(agentId);
  }, []);

  return (
    <div>
      {/* Search */}
      <div style={{ padding: "8px 12px", borderBottom: "0.5px solid var(--border-subtle)", display: "flex", gap: 4 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
          placeholder="Search community agents..."
          style={{
            flex: 1, padding: "4px 8px", fontSize: 11,
            background: "var(--bg-secondary)", border: "0.5px solid var(--border-subtle)",
            borderRadius: "var(--radius-md, 6px)", color: "var(--text-primary)", outline: "none",
          }}
        />
        <button onClick={handleSearch} style={{
          padding: "4px 10px", fontSize: 11, background: "transparent",
          border: "0.5px solid var(--border-strong)", borderRadius: "var(--radius-md, 6px)",
          color: "var(--text-primary)", cursor: "pointer",
        }}>Search</button>
      </div>

      {/* Submit your agents */}
      {agents.length > 0 && (
        <div style={{ padding: "8px 12px", borderBottom: "0.5px solid var(--border-subtle)" }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>
            Share Your Agents
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {agents.map((a) => (
              <button key={a.id} onClick={() => handleSubmit(a.id)} style={{
                padding: "3px 8px", fontSize: 11, background: "transparent",
                border: "0.5px solid var(--border-subtle)", borderRadius: "var(--radius-md, 6px)",
                color: "var(--text-secondary)", cursor: "pointer",
              }}>
                + {a.nickname || a.card.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Community list */}
      {communityAgents.length === 0 && (
        <EmptyState
          icon="community"
          title="No community agents yet"
          description="Share your agents to build the directory and discover others."
        />
      )}
      {communityAgents.map((ca) => {
        const tags: string[] = (() => { try { return JSON.parse(ca.tags); } catch { return []; } })();
        return (
          <div key={ca.id} style={{
            padding: "8px 12px", borderBottom: "0.5px solid var(--border-subtle)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-primary)" }}>{ca.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{ca.description || ca.url}</div>
                {tags.length > 0 && (
                  <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                    {tags.map((t, i) => (
                      <span key={i} style={{
                        padding: "1px 6px", fontSize: 11, background: "var(--bg-secondary)",
                        borderRadius: "var(--radius-md, 6px)", color: "var(--text-muted)",
                      }}>{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Favorites Tab ---
function FavoritesTab() {
  const favorites = useCommunityStore((s) => s.favorites);
  const agents = useAgentStore((s) => s.agents);

  const handleToggle = useCallback(async (agentId: string) => {
    await useCommunityStore.getState().toggleFavorite(agentId);
  }, []);

  // Group by folder
  const folders = favorites.reduce<Record<string, typeof favorites>>((acc, fav) => {
    const f = fav.folder || "default";
    if (!acc[f]) acc[f] = [];
    acc[f].push(fav);
    return acc;
  }, {});

  return (
    <div>
      {/* Quick favorite buttons for current agents */}
      {agents.length > 0 && (
        <div style={{ padding: "8px 12px", borderBottom: "0.5px solid var(--border-subtle)" }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>
            Quick Favorite
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {agents.map((a) => {
              const isFav = favorites.some((f) => f.agentId === a.id);
              return (
                <button key={a.id} onClick={() => handleToggle(a.id)} style={{
                  padding: "3px 8px", fontSize: 11,
                  background: isFav ? "var(--bg-secondary)" : "transparent",
                  border: "0.5px solid var(--border-subtle)", borderRadius: "var(--radius-md, 6px)",
                  color: isFav ? "var(--text-primary)" : "var(--text-secondary)", cursor: "pointer",
                }}>
                  {isFav ? "★" : "☆"} {a.nickname || a.card.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {favorites.length === 0 && (
        <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 11 }}>
          No favorites yet. Star agents to add them here.
        </div>
      )}

      {Object.entries(folders).map(([folder, favs]) => (
        <div key={folder}>
          <div style={{
            padding: "6px 12px", fontSize: 11, fontWeight: 500, color: "var(--text-muted)",
            textTransform: "uppercase", letterSpacing: "0.07em", background: "var(--bg-secondary)",
          }}>
            {folder}
          </div>
          {favs.map((fav) => {
            const agent = agents.find((a) => a.id === fav.agentId);
            return (
              <div key={fav.id} style={{
                padding: "6px 12px", borderBottom: "0.5px solid var(--border-subtle)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-primary)" }}>
                    ★ {agent?.nickname || agent?.card.name || fav.agentId}
                  </div>
                  {fav.notes && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{fav.notes}</div>}
                </div>
                <button onClick={() => handleToggle(fav.agentId)} style={{
                  padding: "2px 4px", fontSize: 11, background: "transparent",
                  border: "none", color: "var(--text-muted)", cursor: "pointer",
                }}>×</button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// --- Health Tab ---
function HealthTab({ workspaceId }: { workspaceId: string }) {
  const agents = useAgentStore((s) => s.agents);
  const latestHealth = useCommunityStore((s) => s.latestHealth);
  const isChecking = useCommunityStore((s) => s.isChecking);

  const handleCheckAll = useCallback(async () => {
    await useCommunityStore.getState().checkAllHealth(workspaceId);
  }, [workspaceId]);

  const handleCheckOne = useCallback(async (agentId: string) => {
    await useCommunityStore.getState().checkHealth(agentId);
  }, []);

  return (
    <div>
      <div style={{
        padding: "8px 12px", borderBottom: "0.5px solid var(--border-subtle)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Agent Health
        </span>
        <button onClick={handleCheckAll} disabled={isChecking} style={{
          padding: "3px 10px", fontSize: 11, background: "transparent",
          border: "0.5px solid var(--border-strong)", borderRadius: "var(--radius-md, 6px)",
          color: "var(--text-primary)", cursor: isChecking ? "default" : "pointer",
          fontWeight: 500, opacity: isChecking ? 0.5 : 1,
        }}>
          {isChecking ? "Checking..." : "Check All"}
        </button>
      </div>

      {agents.length === 0 && (
        <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 11 }}>
          No agents to monitor. Add agents first.
        </div>
      )}

      {agents.map((agent) => {
        const hc = latestHealth[agent.id];
        return (
          <div key={agent.id} style={{
            padding: "8px 12px", borderBottom: "0.5px solid var(--border-subtle)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <HealthDot status={hc?.status} />
              <div>
                <div style={{ fontSize: 11, color: "var(--text-primary)" }}>
                  {agent.nickname || agent.card.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {hc ? (
                    <>
                      {hc.status} · {hc.latencyMs}ms
                      {hc.error && <span style={{ color: "var(--dot-error, #ef4444)" }}> · {hc.error}</span>}
                    </>
                  ) : "Not checked"}
                </div>
              </div>
            </div>
            <button onClick={() => handleCheckOne(agent.id)} style={{
              padding: "2px 8px", fontSize: 11, background: "transparent",
              border: "0.5px solid var(--border-subtle)", borderRadius: "var(--radius-md, 6px)",
              color: "var(--text-secondary)", cursor: "pointer",
            }}>Check</button>
          </div>
        );
      })}
    </div>
  );
}

function HealthDot({ status }: { status?: string }) {
  const color = status === "healthy" ? "var(--dot-online, #22c55e)"
    : status === "degraded" ? "var(--dot-warning, #f59e0b)"
    : status === "down" ? "var(--dot-error, #ef4444)"
    : "var(--text-muted)";
  return (
    <span style={{
      display: "inline-block", width: 6, height: 6, borderRadius: "50%",
      background: color, flexShrink: 0,
    }} />
  );
}
