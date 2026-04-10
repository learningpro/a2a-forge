import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeOverride = "system" | "light" | "dark";
export type Locale = "en" | "zh";

interface UiState {
  themeOverride: ThemeOverride;
  locale: Locale;
  skillPanelWidth: number;
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  /** Signals to open the add-agent dialog */
  addAgentRequested: number;
  /** Signals to run the current test */
  runTestRequested: number;
  setThemeOverride: (theme: ThemeOverride) => void;
  setLocale: (locale: Locale) => void;
  setSkillPanelWidth: (width: number) => void;
  setSidebarWidth: (width: number) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  requestAddAgent: () => void;
  requestRunTest: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      themeOverride: "system",
      locale: "en",
      skillPanelWidth: 240,
      sidebarWidth: 220,
      sidebarCollapsed: false,
      addAgentRequested: 0,
      runTestRequested: 0,
      setThemeOverride: (theme) => set({ themeOverride: theme }),
      setLocale: (locale) => set({ locale }),
      setSkillPanelWidth: (width) => set({ skillPanelWidth: width }),
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      requestAddAgent: () => set((s) => ({ addAgentRequested: s.addAgentRequested + 1 })),
      requestRunTest: () => set((s) => ({ runTestRequested: s.runTestRequested + 1 })),
    }),
    {
      name: "a2a-ui-state",
      partialize: (state) => ({
        themeOverride: state.themeOverride,
        locale: state.locale,
        skillPanelWidth: state.skillPanelWidth,
        sidebarWidth: state.sidebarWidth,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
