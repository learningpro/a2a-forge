import { useState, useEffect, useCallback, useRef } from "react";
import { commands } from "../../bindings";
import { unwrap } from "../../lib/tauri-helpers";
import { useUiStore, type ThemeOverride } from "../../stores/uiStore";
import { fadeBackdrop, slideInRight } from "../../lib/animations";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardId?: string;
}

export function SettingsModal({ isOpen, onClose, cardId }: SettingsModalProps) {
  // Global settings
  const [timeout, setTimeout_] = useState(30000);
  const [proxyUrl, setProxyUrl] = useState("");
  const [theme, setTheme] = useState<ThemeOverride>("system");
  const [telemetry, setTelemetry] = useState(false);

  // Per-card settings
  const [authHeader, setAuthHeader] = useState("");
  const [baseUrlOverride, setBaseUrlOverride] = useState("");

  const setThemeOverride = useUiStore((s) => s.setThemeOverride);

  // Load settings on mount
  useEffect(() => {
    if (!isOpen) return;
    commands.getSettings().then((res) => {
      const settings = unwrap(res) as Record<string, unknown>;
      if (!cardId) {
        // Global settings
        if (settings["timeout_seconds"] != null) {
          setTimeout_(Number(settings["timeout_seconds"]));
        }
        if (settings["proxy_url"] != null) {
          setProxyUrl(String(settings["proxy_url"]));
        }
        if (settings["theme"] != null) {
          setTheme(String(settings["theme"]) as ThemeOverride);
        }
        if (settings["telemetry_enabled"] != null) {
          setTelemetry(settings["telemetry_enabled"] === true || settings["telemetry_enabled"] === "true");
        }
      } else {
        // Per-card settings
        const ah = settings[`card:${cardId}:auth_header`];
        if (ah != null) setAuthHeader(String(ah));
        const bu = settings[`card:${cardId}:base_url_override`];
        if (bu != null) setBaseUrlOverride(String(bu));
      }
    }).catch(() => {
      // ignore load failures
    });
  }, [isOpen, cardId]);

  const saveSetting = useCallback(async (key: string, value: unknown) => {
    try {
      unwrap(await commands.saveSetting(key, JSON.stringify(value)));
    } catch {
      // ignore save failures
    }
  }, []);

  const handleTimeoutChange = useCallback((val: number) => {
    setTimeout_(val);
    saveSetting("timeout_seconds", val);
  }, [saveSetting]);

  const handleProxyChange = useCallback((val: string) => {
    setProxyUrl(val);
    saveSetting("proxy_url", val || null);
  }, [saveSetting]);

  const handleThemeChange = useCallback((val: ThemeOverride) => {
    setTheme(val);
    setThemeOverride(val);
    saveSetting("theme", val);
  }, [saveSetting, setThemeOverride]);

  const handleTelemetryChange = useCallback((val: boolean) => {
    setTelemetry(val);
    saveSetting("telemetry_enabled", val);
  }, [saveSetting]);

  const handleAuthHeaderChange = useCallback((val: string) => {
    setAuthHeader(val);
    if (cardId) saveSetting(`card:${cardId}:auth_header`, val);
  }, [cardId, saveSetting]);

  const handleBaseUrlChange = useCallback((val: string) => {
    setBaseUrlOverride(val);
    if (cardId) saveSetting(`card:${cardId}:base_url_override`, val);
  }, [cardId, saveSetting]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <SettingsModalInner
      cardId={cardId} onClose={onClose}
      timeout={timeout} handleTimeoutChange={handleTimeoutChange}
      proxyUrl={proxyUrl} handleProxyChange={handleProxyChange}
      theme={theme} handleThemeChange={handleThemeChange}
      telemetry={telemetry} handleTelemetryChange={handleTelemetryChange}
      authHeader={authHeader} handleAuthHeaderChange={handleAuthHeaderChange}
      baseUrlOverride={baseUrlOverride} handleBaseUrlChange={handleBaseUrlChange}
    />
  );
}

function SettingsModalInner({ cardId, onClose, timeout, handleTimeoutChange, proxyUrl, handleProxyChange, theme, handleThemeChange, telemetry, handleTelemetryChange, authHeader, handleAuthHeaderChange, baseUrlOverride, handleBaseUrlChange }: {
  cardId?: string; onClose: () => void;
  timeout: number; handleTimeoutChange: (v: number) => void;
  proxyUrl: string; handleProxyChange: (v: string) => void;
  theme: ThemeOverride; handleThemeChange: (v: ThemeOverride) => void;
  telemetry: boolean; handleTelemetryChange: (v: boolean) => void;
  authHeader: string; handleAuthHeaderChange: (v: string) => void;
  baseUrlOverride: string; handleBaseUrlChange: (v: string) => void;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fadeBackdrop(backdropRef.current);
    slideInRight(dialogRef.current);
  }, []);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "7px 10px",
    fontSize: 11,
    fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
    background: "var(--bg-primary)",
    border: "0.5px solid var(--border-default)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-primary)",
    boxSizing: "border-box",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 500,
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    marginBottom: 4,
  };

  return (
    <div
      ref={backdropRef}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        visibility: "hidden",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        style={{
          background: "var(--bg-secondary)",
          borderRadius: "var(--radius-lg)",
          padding: 20,
          width: 480,
          maxWidth: "90vw",
          maxHeight: "80vh",
          overflowY: "auto",
          border: "0.5px solid var(--border-subtle)",
          boxShadow: "var(--shadow-lg)",
          visibility: "hidden",
        }}
      >
        {/* Title */}
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 4,
          }}
        >
          {cardId ? "Agent Settings" : "Settings"}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            marginBottom: 20,
          }}
        >
          {cardId
            ? "Configure settings for this agent card."
            : "Configure global application settings."}
        </div>

        {!cardId ? (
          /* Global settings */
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Timeout */}
            <div>
              <div style={labelStyle}>Default Timeout (ms)</div>
              <input
                type="number"
                value={timeout}
                onChange={(e) => handleTimeoutChange(Number(e.target.value))}
                min={1000}
                max={300000}
                step={1000}
                style={inputStyle}
              />
            </div>

            {/* Proxy URL */}
            <div>
              <div style={labelStyle}>Proxy URL</div>
              <input
                type="text"
                value={proxyUrl}
                onChange={(e) => handleProxyChange(e.target.value)}
                placeholder="http://proxy:8080 (optional)"
                style={inputStyle}
              />
            </div>

            {/* Theme */}
            <div>
              <div style={labelStyle}>Theme</div>
              <select
                value={theme}
                onChange={(e) => handleThemeChange(e.target.value as ThemeOverride)}
                style={{
                  ...inputStyle,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>

            {/* Telemetry */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <input
                type="checkbox"
                checked={telemetry}
                onChange={(e) => handleTelemetryChange(e.target.checked)}
                id="telemetry-opt-in"
                style={{ cursor: "pointer" }}
              />
              <label
                htmlFor="telemetry-opt-in"
                style={{
                  fontSize: 11,
                  color: "var(--text-primary)",
                  cursor: "pointer",
                }}
              >
                Enable telemetry
              </label>
            </div>
          </div>
        ) : (
          /* Per-card settings */
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Auth header */}
            <div>
              <div style={labelStyle}>Default Auth Header</div>
              <input
                type="text"
                value={authHeader}
                onChange={(e) => handleAuthHeaderChange(e.target.value)}
                placeholder="Bearer sk-..."
                style={inputStyle}
              />
            </div>

            {/* Base URL override */}
            <div>
              <div style={labelStyle}>Base URL Override</div>
              <input
                type="text"
                value={baseUrlOverride}
                onChange={(e) => handleBaseUrlChange(e.target.value)}
                placeholder="Override the agent's base URL (optional)"
                style={inputStyle}
              />
            </div>
          </div>
        )}

        {/* Close button */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 20,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "6px 14px",
              fontSize: 11,
              background: "var(--text-primary)",
              border: "0.5px solid var(--border-strong)",
              borderRadius: "var(--radius-md)",
              color: "var(--bg-primary)",
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 500,
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
