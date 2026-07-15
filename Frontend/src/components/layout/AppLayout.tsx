import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";
import { Footer } from "./Footer";
import { LiveLedgerTicker } from "./LiveLedgerTicker";
import { Nav } from "./Nav";
import { Sidebar } from "./Sidebar";

function AppShell() {
  const { width } = useSidebar();
  const { pathname } = useLocation();
  const showLedger = pathname === "/";

  return (
    <div className="flex min-h-svh bg-paper">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Sidebar />
      <div
        className="flex min-h-svh flex-1 flex-col transition-[padding] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        style={{ paddingLeft: width }}
      >
        <Nav />
        <div className="flex flex-1">
          <main id="main-content" className="min-w-0 flex-1" tabIndex={-1}>
            <Outlet />
          </main>
          {showLedger && <LiveLedgerTicker />}
        </div>
        <Footer />
      </div>
    </div>
  );
}

export function AppLayout() {
  return (
    <SidebarProvider>
      <AppShell />
    </SidebarProvider>
  );
}
