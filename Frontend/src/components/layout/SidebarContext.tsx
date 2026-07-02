import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

const PIN_KEY = "safeline-sidebar-pinned";
const COLLAPSED = 72;
const EXPANDED = 220;

interface SidebarContextValue {
  pinned: boolean;
  setPinned: (v: boolean) => void;
  hovered: boolean;
  setHovered: (v: boolean) => void;
  width: number;
  expanded: boolean;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [pinned, setPinnedState] = useState(() => {
    try {
      return localStorage.getItem(PIN_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [hovered, setHovered] = useState(false);
  const expanded = pinned || hovered;
  const width = expanded ? EXPANDED : COLLAPSED;

  const setPinned = (v: boolean) => {
    setPinnedState(v);
    try {
      localStorage.setItem(PIN_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  const value = useMemo(
    () => ({ pinned, setPinned, hovered, setHovered, width, expanded }),
    [pinned, hovered, width, expanded],
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}

export { COLLAPSED, EXPANDED, PIN_KEY };
