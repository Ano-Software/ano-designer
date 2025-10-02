export type ThemePreference = "light" | "dark";

const STORAGE_KEY = "ano-designer-theme";

function isBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

export function getStoredTheme(): ThemePreference | null {
  if (!isBrowser()) {
    return null;
  }

  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === "dark" || value === "light" ? value : null;
}

export function getInitialTheme(profileTheme?: ThemePreference | null) {
  const stored = getStoredTheme();
  if (stored) {
    return stored;
  }

  if (profileTheme === "dark" || profileTheme === "light") {
    return profileTheme;
  }

  if (isBrowser()) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  return "light";
}

export function applyTheme(theme: ThemePreference) {
  if (!isBrowser()) {
    return;
  }

  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
}

export function saveTheme(theme: ThemePreference) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, theme);
}
