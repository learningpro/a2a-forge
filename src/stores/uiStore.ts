import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeOverride = "system" | "light" | "dark";

interface UiState {
  themeOverride: ThemeOverride;
  skillPanelWidth: number;
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  setThemeOverride: (theme: ThemeOverride) => void;
  setSkillPanelWidth: (width: number) => void;
  setSidebarWidth: (width: number) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      themeOverride: "system",
      skillPanelWidth: 240,
      sidebarWidth: 220,
      sidebarCollapsed: false,
      setThemeOverride: (theme) => set({ themeOverride: theme }),
      setSkillPanelWidth: (width) => set({ skillPanelWidth: width }),
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    {
      name: "a2a-ui-state",
      partialize: (state) => ({
        themeOverride: state.themeOverride,
        skillPanelWidth: state.skillPanelWidth,
        sidebarWidth: state.sidebarWidth,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
