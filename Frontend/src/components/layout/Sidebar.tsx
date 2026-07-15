import {
  Home,
  Info,
  LayoutDashboard,
  MessageCircle,
  PanelLeft,
  Phone,
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { AccessibilityModeToggle } from "@/components/AccessibilityModeToggle";
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
  const { expanded, pinned, setHovered, togglePin } = useSidebar();
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
      "nav-tip group relative z-10 flex h-10 min-h-11 items-center gap-3 rounded-[8px] px-3 transition-colors duration-200",
      "hover:text-verified focus-visible:text-verified",
      isActive ? "text-ink" : "text-ink/65",
    );

  const iconClass = () => "h-5 w-5 shrink-0";

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 flex h-svh flex-col border-r border-line bg-paper/95 backdrop-blur-sm transition-[width] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
        expanded ? "w-[220px]" : "w-[72px]",
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      aria-label="Primary"
    >
      <nav
        className="relative flex flex-1 flex-col px-2 pb-4 pt-3"
        aria-label="Primary"
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            if (!pinned) setHovered(false);
          }
        }}
      >
        {pill.visible && (
          <div
            className="nav-active-pill absolute left-2 right-2 transition-[top,height] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
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
            aria-label={label}
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={iconClass()}
                  strokeWidth={isActive ? 2 : 1.5}
                  aria-hidden
                />
                <span
                  className={cn(
                    "whitespace-nowrap font-mono text-[10px] uppercase tracking-wider transition-opacity",
                    expanded ? "opacity-100" : "pointer-events-none opacity-0",
                  )}
                  aria-hidden={!expanded}
                >
                  {label}
                </span>
                {isActive && <span className="sr-only">(current page)</span>}
              </>
            )}
          </NavLink>
        ))}

        <div className="my-3 border-t border-line" role="presentation" />

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
                aria-label={`${item.label} (opens in a new tab)`}
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} aria-hidden />
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
              aria-label={item.label}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={iconClass()}
                    strokeWidth={isActive ? 2 : 1.5}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      "whitespace-nowrap font-mono text-[10px] uppercase tracking-wider transition-opacity",
                      expanded ? "opacity-100" : "pointer-events-none opacity-0",
                    )}
                    aria-hidden={!expanded}
                  >
                    {item.label}
                  </span>
                  {isActive && <span className="sr-only">(current page)</span>}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="flex flex-col gap-2 border-t border-line px-2 py-3">
        <button
          type="button"
          onClick={togglePin}
          className={cn(
            "a11y-control inline-flex h-10 min-h-11 w-full items-center justify-center gap-2 rounded-[6px] border border-line font-mono text-[10px] uppercase tracking-wider text-ink/65 hover:bg-ink/[0.04] hover:text-ink",
            pinned && "bg-verified/10 text-ink",
          )}
          aria-pressed={pinned}
          aria-label={pinned ? "Unpin sidebar" : "Pin sidebar open"}
          title={pinned ? "Unpin sidebar" : "Pin sidebar open"}
        >
          <PanelLeft className="h-4 w-4 shrink-0" aria-hidden />
          {expanded && <span>{pinned ? "Pinned" : "Pin"}</span>}
        </button>
        <AccessibilityModeToggle
          showLabel={expanded}
          className={cn("w-full justify-center", !expanded && "px-2")}
        />
        <ThemeToggle
          showLabel={expanded}
          className={cn("w-full justify-center", !expanded && "px-2")}
        />
      </div>
    </aside>
  );
}
