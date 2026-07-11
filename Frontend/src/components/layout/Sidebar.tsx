import {
  Home,
  Info,
  LayoutDashboard,
  MessageCircle,
  Phone,
  Pin,
  PinOff,
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { WHATSAPP_NUMBER } from "@/components/WhatsAppMockup";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSidebar } from "@/contexts/SidebarContext";
import { cn } from "@/lib/cn";

const NAV_MAIN = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/chat", label: "Check a message", icon: MessageCircle },
] as const;

const NAV_BOTTOM = [
  {
    href: `https://wa.me/${WHATSAPP_NUMBER}`,
    label: "WhatsApp desk",
    icon: Phone,
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
      "nav-tip group relative z-10 flex h-10 items-center gap-3 rounded-[8px] px-3 transition-[color,transform] duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
      "hover:scale-105",
      isActive
        ? "font-medium text-ink"
        : "text-ink/50 hover:text-ink/75",
    );

  const iconClass = (isActive: boolean) =>
    cn(
      "h-5 w-5 shrink-0 transition-colors",
      isActive ? "text-verified" : "text-current",
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
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-2 py-2">
        <span
          className={cn(
            "font-mono text-[9px] uppercase tracking-[0.2em] text-alive transition-opacity",
            expanded ? "opacity-100 pl-1" : "sr-only",
          )}
        >
          Desk
        </span>
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            togglePin();
          }}
          className={cn(
            "relative z-20 flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] border border-line/80 bg-paper text-ink/55 transition-colors hover:border-alive/40 hover:bg-alive/10 hover:text-alive active:scale-95",
            !expanded && "mx-auto",
          )}
          aria-label={pinned ? "Unpin sidebar" : "Pin sidebar"}
        >
          {pinned ? (
            <PinOff className="h-5 w-5" strokeWidth={1.75} />
          ) : (
            <Pin className="h-5 w-5" strokeWidth={1.75} />
          )}
        </button>
      </div>

      <nav className="relative flex flex-1 flex-col px-2 pb-4">
        {pill.visible && (
          <div
            className="absolute left-2 right-2 rounded-[8px] border border-alive/30 bg-alive/25 shadow-[0_0_20px_rgb(var(--color-alive-rgb)/0.3)] transition-[top,height] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
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
            title={label}
            data-tip={expanded ? undefined : label}
            className={linkClass}
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={iconClass(isActive)}
                  strokeWidth={isActive ? 2.25 : 1.5}
                />
                <span
                  className={cn(
                    "whitespace-nowrap font-mono text-[10px] uppercase tracking-wider transition-opacity",
                    expanded ? "opacity-100" : "pointer-events-none opacity-0",
                  )}
                >
                  {label}
                </span>
              </>
            )}
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
                title={item.label}
                data-tip={expanded ? undefined : item.label}
                className={cn(linkClass({ isActive: false }), "nav-tip")}
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
              title={item.label}
              data-tip={expanded ? undefined : item.label}
              className={linkClass}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={iconClass(isActive)}
                    strokeWidth={isActive ? 2.25 : 1.5}
                  />
                  <span
                    className={cn(
                      "whitespace-nowrap font-mono text-[10px] uppercase tracking-wider transition-opacity",
                      expanded ? "opacity-100" : "pointer-events-none opacity-0",
                    )}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-line px-2 py-3">
        <ThemeToggle
          showLabel={expanded}
          className={cn("w-full justify-center", !expanded && "px-2")}
        />
      </div>
    </aside>
  );
}
