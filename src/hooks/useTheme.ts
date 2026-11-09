/* SPDX-License-Identifier: MPL-2.0 */

import { useCallback, useEffect, useState } from "react";
import { branding } from "../branding";

export type Theme = "light" | "dark";
export type ThemePreference = Theme | "system";

/**
 * Theme preference lives outside the v1 app-data prefix so clearing study
 * data does not reset the appearance.
 */
const THEME_KEY = "ham-exam-cn:theme";

function readPreference(): ThemePreference {
  try {
    const value = window.localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Theme state machine: system -> resolved light/dark, until the user picks an
 * explicit preference; from then on system changes are ignored.
 */
export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(readPreference);
  const [system, setSystem] = useState<Theme>(systemTheme);
  const theme: Theme = preference === "system" ? system : preference;

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => {
      setSystem(event.matches ? "dark" : "light");
    };
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? branding.themeColorDark : branding.themeColor);
  }, [theme]);

  const toggle = useCallback(() => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setPreference(next);
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      // Storage can be unavailable; the theme still applies for this session.
    }
  }, [theme]);

  return { theme, preference, toggle };
}
