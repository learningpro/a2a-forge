import { describe, it, expect, beforeEach } from "vitest";
import { useUiStore } from "./uiStore";

describe("uiStore", () => {
  beforeEach(() => {
    // Reset store to initial state
    useUiStore.setState({
      themeOverride: "system",
      skillPanelWidth: 240,
      sidebarCollapsed: false,
    });
  });

  it("should have correct initial state", () => {
    const state = useUiStore.getState();
    expect(state.themeOverride).toBe("system");
    expect(state.skillPanelWidth).toBe(240);
    expect(state.sidebarCollapsed).toBe(false);
  });

  it("should update themeOverride", () => {
    useUiStore.getState().setThemeOverride("dark");
    expect(useUiStore.getState().themeOverride).toBe("dark");
  });

  it("should update skillPanelWidth", () => {
    useUiStore.getState().setSkillPanelWidth(300);
    expect(useUiStore.getState().skillPanelWidth).toBe(300);
  });

  it("should update sidebarCollapsed", () => {
    useUiStore.getState().setSidebarCollapsed(true);
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
  });
});
