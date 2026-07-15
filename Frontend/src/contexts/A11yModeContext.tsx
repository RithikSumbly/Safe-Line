import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type A11yMode = "default" | "accessibility";

const STORAGE_KEY = "safeline-a11y-mode";

interface A11yModeContextValue {
  mode: A11yMode;
  isAccessibility: boolean;
  setMode: (mode: A11yMode) => void;
  toggleMode: () => void;
}

const A11yModeContext = createContext<A11yModeContextValue | null>(null);

function readStoredMode(): A11yMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === "accessibility"
      ? "accessibility"
      : "default";
  } catch {
    return "default";
  }
}

function applyA11yMode(mode: A11yMode) {
  document.documentElement.setAttribute("data-a11y", mode);
}

export function A11yModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<A11yMode>(readStoredMode);

  useLayoutEffect(() => {
    applyA11yMode(mode);
  }, [mode]);

  const setMode = useCallback((next: A11yMode) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === "accessibility" ? "default" : "accessibility");
  }, [setMode, mode]);

  const value = useMemo(
    () => ({
      mode,
      isAccessibility: mode === "accessibility",
      setMode,
      toggleMode,
    }),
    [mode, setMode, toggleMode],
  );

  return (
    <A11yModeContext.Provider value={value}>{children}</A11yModeContext.Provider>
  );
}

export function useA11yMode() {
  const ctx = useContext(A11yModeContext);
  if (!ctx) throw new Error("useA11yMode must be used within A11yModeProvider");
  return ctx;
}
