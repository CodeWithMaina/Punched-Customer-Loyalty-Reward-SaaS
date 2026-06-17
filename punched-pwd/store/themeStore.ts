import { create } from "zustand";

export type ThemeName = "blue" | "green" | "purple" | "amber" | "slate";

export const THEMES: { value: ThemeName; label: string; primary: string; accent: string }[] = [
  { value: "blue",   label: "Ocean Blue",    primary: "#2563EB", accent: "#F59E0B" },
  { value: "green",  label: "Forest Green",  primary: "#059669", accent: "#7C3AED" },
  { value: "purple", label: "Royal Purple",  primary: "#7C3AED", accent: "#EC4899" },
  { value: "amber",  label: "Golden Amber",  primary: "#D97706", accent: "#0EA5E9" },
  { value: "slate",  label: "Midnight Slate", primary: "#475569", accent: "#0EA5E9" },
];

const VALID_THEMES = new Set<ThemeName>(["blue", "green", "purple", "amber", "slate"]);

interface ThemeState {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
}

function getInitialTheme(): ThemeName {
  if (typeof window === "undefined") return "blue";
  const saved = localStorage.getItem("punched-theme") as ThemeName | null;
  if (saved && VALID_THEMES.has(saved)) return saved;
  return "blue";
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: "blue" as ThemeName,
  setTheme: (t) => {
    localStorage.setItem("punched-theme", t);
    document.documentElement.setAttribute("data-theme", t);
    set({ theme: t });
  },
}));

/** Call once on app mount to hydrate from localStorage */
export function applyStoredTheme() {
  const t = getInitialTheme();
  document.documentElement.setAttribute("data-theme", t);
  useThemeStore.setState({ theme: t });
}
