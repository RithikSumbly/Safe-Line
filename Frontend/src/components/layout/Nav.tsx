import { Link } from "react-router-dom";
import { WHATSAPP_NUMBER } from "@/components/WhatsAppMockup";
import { useAuth } from "@/contexts/AuthContext";

export function Nav() {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-sm">
      <div className="accent-bar" aria-hidden />
      <div className="content-shell flex items-center justify-between gap-4 py-2.5">
        <Link to="/" className="group shrink-0">
          <span className="font-display text-xl font-semibold leading-none text-ink md:text-2xl">
            SafeLine
          </span>
          <span className="mt-0.5 hidden font-mono text-[9px] tracking-wide text-ink/45 sm:block">
            cited checks, not guesses
          </span>
        </Link>

        <div className="flex items-center gap-4 md:gap-5">
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-verified underline underline-offset-2 transition-colors hover:text-alive hover:shadow-[0_0_12px_rgba(0,212,184,0.35)]"
          >
            WhatsApp desk
          </a>
          {user ? (
            <>
              <button
                type="button"
                onClick={() => signOut()}
                className="font-mono text-xs uppercase tracking-wider text-ink/55 transition-colors hover:text-ink"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/sign-in"
              className="font-mono text-xs uppercase tracking-wider text-ink/55 transition-colors hover:text-alive"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
