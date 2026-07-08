import {
  Briefcase,
  Home,
  Info,
  LayoutDashboard,
  MessageCircle,
  Pin,
  PinOff,
  Radio,
  ShieldAlert,
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { WHATSAPP_NUMBER } from "@/components/WhatsAppMockup";
import { useSidebar } from "@/contexts/SidebarContext";
import { cn } from "@/lib/cn";

const NAV_MAIN = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/scam", label: "Scams", icon: ShieldAlert },
  { to: "/jobs", label: "Jobs", icon: Briefcase },
  { to: "/crisis", label: "Rumors", icon: Radio },
] as const;

const NAV_BOTTOM = [
  {
    href: `https://wa.me/${WHATSAPP_NUMBER}`,
    label: "WhatsApp desk",
    icon: MessageCircle,
    external: true,
  },
  { to: "/dashboard", label: "Archive", icon: LayoutDashboard },
  { to: "/about", label: "About", icon: Info },
] as const;

export function Sidebar() {
  const location = useLocation();
  const { pinned, expanded, setHovered, togglePin } = useSidebar();
  const itemRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const [pill, setPill] = useState({ top: 0, height: 40, visible: false });

  const updatePill = useCallback(() => {
    const path = location.pathname;
    const key =
      NAV_MAIN.find((n) =>
        "end" in n && n.end ? path === n.to : path.startsWith(n.to),
      )?.to ??
      NAV_BOTTOM.find(
        (n): n is (typeof NAV_BOTTOM)[number] & { to: string } =>
          "to" in n && path.startsWith(n.to),
      )?.to;
    if (!key) {
      setPill((p) => ({ ...p, visible: false }));
      return;
    }
    const el = itemRefs.current.get(key);
    if (!el) return;
    setPill({
      top: el.offsetTop,
      height: el.offsetHeight,
      visible: true,
    });
  }, [location.pathname]);

  useLayoutEffect(() => {
    updatePill();
  }, [updatePill, expanded]);

  useEffect(() => {
    window.addEventListener("resize", updatePill);
    return () => window.removeEventListener("resize", updatePill);
  }, [updatePill]);

  const setRef = (key: string) => (el: HTMLAnchorElement | null) => {
    if (el) itemRefs.current.set(key, el);
    else itemRefs.current.delete(key);
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "group relative z-10 flex h-10 items-center gap-3 rounded-[8px] px-3 transition-[color,transform] duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
      "hover:scale-105 hover:text-verified",
      isActive ? "text-ink" : "text-ink/55",
    );

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 flex h-svh flex-col border-r border-line bg-paper/95 backdrop-blur-sm transition-[width] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
        expanded ? "w-[220px]" : "w-[72px]",
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label="Primary navigation"
    >
      <div className="flex items-center justify-between px-3 py-3">
        <span
          className={cn(
            "font-mono text-[9px] uppercase tracking-[0.2em] text-alive transition-opacity",
            expanded ? "opacity-100" : "opacity-0",
          )}
        >
          Desk
        </span>
        <button
          type="button"
          onClick={togglePin}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-[6px] text-ink/45 transition-colors hover:bg-alive/10 hover:text-alive",
            expanded ? "opacity-100" : "mx-auto opacity-100",
          )}
          aria-label={pinned ? "Unpin sidebar" : "Pin sidebar"}
        >
          {pinned ? (
            <PinOff className="h-4 w-4" strokeWidth={1.5} />
          ) : (
            <Pin className="h-4 w-4" strokeWidth={1.5} />
          )}
        </button>
      </div>

      <nav className="relative flex flex-1 flex-col px-2 pb-4">
        {pill.visible && (
          <div
            className="absolute left-2 right-2 rounded-[8px] bg-alive/15 shadow-[0_0_20px_rgba(0,212,184,0.25)] transition-[top,height] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            style={{ top: pill.top, height: pill.height }}
            aria-hidden
          />
        )}

        {NAV_MAIN.map(({ to, label, icon: Icon, ...rest }) => (
          <NavLink
            key={to}
            to={to}
            end={"end" in rest}
            ref={setRef(to)}
            className={linkClass}
          >
            <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
            <span
              className={cn(
                "whitespace-nowrap font-mono text-[10px] uppercase tracking-wider transition-opacity",
                expanded ? "opacity-100" : "pointer-events-none opacity-0",
              )}
            >
              {label}
            </span>
          </NavLink>
        ))}

        <div className="my-3 border-t border-line" />

        {NAV_BOTTOM.map((item) => {
          const Icon = item.icon;
          if ("external" in item && item.external) {
            return (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass({ isActive: false })}
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
                <span
                  className={cn(
                    "whitespace-nowrap font-mono text-[10px] uppercase tracking-wider transition-opacity",
                    expanded ? "opacity-100" : "opacity-0",
                  )}
                >
                  {item.label}
                </span>
              </a>
            );
          }
          const to = "to" in item ? item.to : "/";
          return (
            <NavLink
              key={to}
              to={to}
              ref={setRef(to)}
              className={linkClass}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
              <span
                className={cn(
                  "whitespace-nowrap font-mono text-[10px] uppercase tracking-wider transition-opacity",
                  expanded ? "opacity-100" : "opacity-0",
                )}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
