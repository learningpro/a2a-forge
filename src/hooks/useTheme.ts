import { useEffect } from "react";
import { useUiStore } from "../stores/uiStore";

export function useTheme() {
  const themeOverride = useUiStore((s) => s.themeOverride);

  useEffect(() => {
    const html = document.documentElement;
    if (themeOverride === "dark") {
      html.setAttribute("data-theme", "dark");
    } else if (themeOverride === "light") {
      html.setAttribute("data-theme", "light");
    } else {
      html.removeAttribute("data-theme");
    }
  }, [themeOverride]);

  return themeOverride;
}
