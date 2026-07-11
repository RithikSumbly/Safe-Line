import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type SiteTheme = "default" | "coffee";

const STORAGE_KEY = "safeline-theme";

interface ThemeContextValue {
  theme: SiteTheme;
  isCoffee: boolean;
  setTheme: (theme: SiteTheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): SiteTheme {
  try {
    return localStorage.getItem(STORAGE_KEY) === "coffee" ? "coffee" : "default";
  } catch {
    return "default";
  }
}

function applyTheme(theme: SiteTheme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme === "coffee" ? "coffee" : "desk");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<SiteTheme>(readStoredTheme);

  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: SiteTheme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "coffee" ? "default" : "coffee");
  }, [setTheme, theme]);

  const value = useMemo(
    () => ({
      theme,
      isCoffee: theme === "coffee",
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
