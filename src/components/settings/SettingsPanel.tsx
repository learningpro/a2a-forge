import { useState, useEffect, useCallback, useRef } from "react";
import { commands } from "../../bindings";
import { unwrap } from "../../lib/tauri-helpers";
import { useUiStore, type ThemeOverride, type Locale } from "../../stores/uiStore";
import { useT } from "../../lib/i18n";
import { fadeBackdrop, slideInRight } from "../../lib/animations";

type SettingsTab = "appearance" | "language" | "data" | "about";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [theme, setTheme] = useState<ThemeOverride>("system");
  const [timeout, setTimeout_] = useState(30000);
  const [dataPath, setDataPath] = useState("");

  const setThemeOverride = useUiStore((s) => s.setThemeOverride);
  const locale = useUiStore((s) => s.locale);
  const setLocale = useUiStore((s) => s.setLocale);

  useEffect(() => {
    if (!isOpen) return;
    commands.getSettings().then((res) => {
      const settings = unwrap(res) as Record<string, unknown>;
      if (settings["timeout_seconds"] != null) setTimeout_(Number(settings["timeout_seconds"]) * 1000);
      if (settings["theme"] != null) setTheme(String(settings["theme"]) as ThemeOverride);
    }).catch(() => {});
    commands.getDataPath().then((res) => setDataPath(unwrap(res))).catch(() => {});
  }, [isOpen]);

  const saveSetting = useCallback(async (key: string, value: unknown) => {
    try { unwrap(await commands.saveSetting(key, JSON.stringify(value))); } catch {}
  }, []);

  const handleThemeChange = useCallback((val: ThemeOverride) => {
    setTheme(val);
    setThemeOverride(val);
    // Theme is persisted via Zustand persist (uiStore), not SQLite
  }, [setThemeOverride]);

  const handleLocaleChange = useCallback((val: Locale) => {
    setLocale(val);
    // Locale is persisted via Zustand persist (uiStore), not SQLite
  }, [setLocale]);

  const handleTimeoutChange = useCallback((val: number) => {
    setTimeout_(val);
    saveSetting("timeout_seconds", Math.round(val / 1000));
  }, [saveSetting]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <SettingsPanelInner
      onClose={onClose}
      theme={theme} handleThemeChange={handleThemeChange}
      locale={locale} handleLocaleChange={handleLocaleChange}
      timeout={timeout} handleTimeoutChange={handleTimeoutChange}
      dataPath={dataPath}
    />
  );
}

function SettingsPanelInner({
  onClose, theme, handleThemeChange, locale, handleLocaleChange,
  timeout, handleTimeoutChange, dataPath,
}: {
  onClose: () => void;
  theme: ThemeOverride; handleThemeChange: (v: ThemeOverride) => void;
  locale: Locale; handleLocaleChange: (v: Locale) => void;
  timeout: number; handleTimeoutChange: (v: number) => void;
  dataPath: string;
}) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");
  const { t } = useT();
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fadeBackdrop(backdropRef.current);
    slideInRight(dialogRef.current);
  }, []);

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: "appearance", label: t("settings.appearance") },
    { id: "language", label: t("settings.language") },
    { id: "data", label: t("settings.data") },
    { id: "about", label: t("settings.about") },
  ];

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "7px 10px", fontSize: 12,
    fontFamily: "var(--font-mono)", background: "var(--bg-primary)",
    border: "0.5px solid var(--border-default)", borderRadius: "var(--radius-md)",
    color: "var(--text-primary)", boxSizing: "border-box", outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 500, color: "var(--text-secondary)",
    textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6,
  };

  return (
    <div
      ref={backdropRef}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, visibility: "hidden",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-dialog-title"
        style={{
          background: "var(--bg-secondary)", borderRadius: "var(--radius-lg)",
          width: 560, maxWidth: "90vw", maxHeight: "80vh",
          border: "0.5px solid var(--border-subtle)", boxShadow: "var(--shadow-lg)",
          display: "flex", overflow: "hidden", visibility: "hidden",
        }}
      >
        {/* Left nav */}
        <div style={{
          width: 160, padding: "20px 0", borderRight: "0.5px solid var(--border-subtle)",
          display: "flex", flexDirection: "column", gap: 2, flexShrink: 0,
        }}>
          <div id="settings-dialog-title" style={{ fontSize: 14, fontWeight: 600, padding: "0 16px 12px", color: "var(--text-primary)" }}>
            {t("settings.title")}
          </div>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "8px 16px", fontSize: 12, fontWeight: activeTab === tab.id ? 500 : 400,
                background: activeTab === tab.id ? "var(--bg-primary)" : "transparent",
                border: "none", borderRight: activeTab === tab.id ? "2px solid var(--text-info)" : "2px solid transparent",
                color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-secondary)",
                cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                transition: "background 0.1s, color 0.1s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right content */}
        <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
          {activeTab === "appearance" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <div style={labelStyle}>{t("settings.theme")}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["system", "light", "dark"] as ThemeOverride[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => handleThemeChange(v)}
                      style={{
                        padding: "6px 16px", fontSize: 12, borderRadius: "var(--radius-md)",
                        border: `0.5px solid ${theme === v ? "var(--text-info)" : "var(--border-default)"}`,
                        background: theme === v ? "var(--bg-info, #DBEAFE)" : "var(--bg-primary)",
                        color: theme === v ? "var(--text-info)" : "var(--text-secondary)",
                        cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
                        transition: "background 0.1s, border-color 0.1s",
                      }}
                    >
                      {t(`settings.theme${v.charAt(0).toUpperCase() + v.slice(1)}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={labelStyle}>{t("settings.timeout")}</div>
                <input type="number" value={timeout} onChange={(e) => handleTimeoutChange(Number(e.target.value))} min={1000} max={300000} step={1000} style={inputStyle} />
              </div>
            </div>
          )}

          {activeTab === "language" && (
            <div>
              <div style={labelStyle}>{t("settings.languageLabel")}</div>
              <div style={{ display: "flex", gap: 8 }}>
                {([["en", "English"], ["zh", "中文"]] as [Locale, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => handleLocaleChange(val)}
                    style={{
                      padding: "8px 24px", fontSize: 13, borderRadius: "var(--radius-md)",
                      border: `0.5px solid ${locale === val ? "var(--text-info)" : "var(--border-default)"}`,
                      background: locale === val ? "var(--bg-info, #DBEAFE)" : "var(--bg-primary)",
                      color: locale === val ? "var(--text-info)" : "var(--text-secondary)",
                      cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
                      transition: "background 0.1s, border-color 0.1s",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === "data" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={labelStyle}>{t("settings.dataPath")}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>{t("settings.dataPathDesc")}</div>
                <div style={{
                  padding: "8px 12px", fontSize: 12, fontFamily: "var(--font-mono)",
                  background: "var(--bg-primary)", border: "0.5px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)", color: "var(--text-secondary)",
                  wordBreak: "break-all",
                }}>
                  {dataPath || "—"}
                </div>
              </div>
            </div>
          )}

          {activeTab === "about" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>A2A Forge</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {t("settings.description")}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ color: "var(--text-muted)", width: 80 }}>{t("settings.version")}</span>
                  <span style={{ fontFamily: "var(--font-mono)" }}>0.1.0</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ color: "var(--text-muted)", width: 80 }}>{t("settings.license")}</span>
                  <span>MIT</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ color: "var(--text-muted)", width: 80 }}>{t("settings.author")}</span>
                  <span>Orange Dong</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ color: "var(--text-muted)", width: 80 }}>{t("settings.github")}</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-info)" }}>learningpro/a2a-forge</span>
                </div>
              </div>
            </div>
          )}

          {/* Close button */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
            <button
              onClick={onClose}
              style={{
                padding: "6px 16px", fontSize: 12, fontWeight: 500,
                background: "var(--text-primary)", border: "none",
                borderRadius: "var(--radius-md)", color: "var(--bg-primary)",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {t("action.done")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
