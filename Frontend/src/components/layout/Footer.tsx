import { Link } from "react-router-dom";
import { WHATSAPP_NUMBER } from "@/components/WhatsAppMockup";

export function Footer() {
  return (
    <footer className="mt-auto border-t-2 border-ink/10 bg-paper">
      <div className="content-shell py-10">
        <div className="flex flex-col gap-8 border-b border-line pb-8 md:flex-row md:justify-between">
          <div>
            <p className="font-display text-xl font-semibold text-ink">SafeLine</p>
            <p className="measure mt-2 font-sans text-sm leading-relaxed text-ink/55">
              A verification desk for suspicious messages, offers, and rumors —
              every verdict tied to named sources.
            </p>
          </div>
          <nav
            className="flex flex-col gap-2 font-mono text-xs uppercase tracking-wider"
            aria-label="Footer"
          >
            <Link to="/scam" className="text-ink/55 hover:text-ink">
              Scam messages
            </Link>
            <Link to="/jobs" className="text-ink/55 hover:text-ink">
              Job offers
            </Link>
            <Link to="/crisis" className="text-ink/55 hover:text-ink">
              Crisis rumors
            </Link>
            <Link to="/about" className="text-ink/55 hover:text-ink">
              Responsible use
            </Link>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              className="text-verified hover:text-ink"
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp desk
            </a>
          </nav>
        </div>
        <p className="mt-6 font-mono text-[11px] leading-relaxed text-ink/40">
          Not legal, financial, or emergency advice. In an emergency, contact
          local authorities. Report fraud: cybercrime.gov.in · 1930
        </p>
      </div>
    </footer>
  );
}
