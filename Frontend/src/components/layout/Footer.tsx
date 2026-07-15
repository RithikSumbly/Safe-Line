import { Link, useLocation } from "react-router-dom";
import { WHATSAPP_NUMBER } from "@/components/WhatsAppMockup";
import { cn } from "@/lib/cn";

const FOOTER_LINKS = [
  { to: "/scam", label: "Scam messages" },
  { to: "/jobs", label: "Job offers" },
  { to: "/crisis", label: "Crisis rumors" },
  { to: "/about", label: "Responsible use" },
] as const;

export function Footer() {
  const { pathname } = useLocation();

  return (
    <footer className="mt-auto border-t-2 border-ink/10 bg-paper">
      <div className="content-shell py-10">
        <div className="flex flex-col gap-8 border-b border-line pb-8 md:flex-row md:justify-between">
          <div>
            <p className="font-display text-xl font-semibold text-ink">SafeLine</p>
            <p className="measure mt-2 font-sans text-sm leading-relaxed text-ink/75">
              A verification desk for suspicious messages, offers, and rumors —
              every verdict tied to named sources.
            </p>
          </div>
          <nav
            className="flex flex-col gap-2 font-mono text-xs font-medium uppercase tracking-wider"
            aria-label="Footer"
          >
            {FOOTER_LINKS.map(({ to, label }) => {
              const active = pathname === to || pathname.startsWith(`${to}/`);
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "hover:text-ink",
                    active ? "font-semibold text-ink" : "text-ink/80",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {label}
                </Link>
              );
            })}
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              className="text-verified underline underline-offset-2 hover:text-ink"
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp desk
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </nav>
        </div>
        <p className="mt-6 font-mono text-[11px] leading-relaxed text-ink/70">
          Not legal, financial, or emergency advice. In an emergency, contact
          local authorities. Report fraud: cybercrime.gov.in · 1930
        </p>
      </div>
    </footer>
  );
}
