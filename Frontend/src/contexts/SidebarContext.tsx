import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const PIN_KEY = "safeline-sidebar-pinned";

interface SidebarContextValue {
  pinned: boolean;
  hovered: boolean;
  expanded: boolean;
  width: number;
  setPinned: (value: boolean) => void;
  setHovered: (value: boolean) => void;
  togglePin: () => void;
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
  const width = pinned ? 220 : 72;

  const setPinned = useCallback((value: boolean) => {
    setPinnedState(value);
    try {
      localStorage.setItem(PIN_KEY, value ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const togglePin = useCallback(() => {
    setPinnedState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(PIN_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      pinned,
      hovered,
      expanded,
      width,
      setPinned,
      setHovered,
      togglePin,
    }),
    [pinned, hovered, expanded, width, setPinned, togglePin],
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
