import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getUserChecks, type SavedCheck } from "@/lib/checks";
import { cn } from "@/lib/cn";
import { AGENT_LABELS, STATUS_STAMP } from "@/types/agent";

interface RecentChecksStripProps {
  className?: string;
}

export function RecentChecksStrip({ className }: RecentChecksStripProps) {
  const { user } = useAuth();
  const [checks, setChecks] = useState<SavedCheck[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getUserChecks(user.id, { limit: 5 })
      .then(setChecks)
      .catch(() => setChecks([]))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className={cn("border-t border-line pt-6 text-center", className)}>
        <p className="font-sans text-sm text-ink/60">
          <Link to="/sign-in" className="text-ink underline underline-offset-2">
            Sign in
          </Link>{" "}
          to save your check history.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={cn("border-t border-line pt-6", className)}>
        <p className="font-sans text-sm text-ink/60">Loading recent checks…</p>
      </div>
    );
  }

  if (checks.length === 0) {
    return (
      <div className={cn("border-t border-line pt-6", className)}>
        <p className="font-sans text-sm text-ink/60">
          No saved checks yet. Run a check above to build your history.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("border-t border-line pt-6", className)}>
      <h2 className="mb-4 font-display text-lg font-semibold text-ink">
        Recent checks
      </h2>
      <ul className="divide-y divide-line border border-line rounded-[10px]">
        {checks.map((check) => (
          <li
            key={check.id}
            className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-sans text-sm text-ink truncate max-w-md">
                {check.input_text?.slice(0, 80)}
                {(check.input_text?.length ?? 0) > 80 ? "…" : ""}
              </p>
              <p className="font-mono text-xs text-ink/40">
                {AGENT_LABELS[check.agent]} ·{" "}
                {new Date(check.created_at).toLocaleDateString()}
              </p>
            </div>
            <span
              className={cn(
                "self-start font-mono text-xs font-medium sm:self-center",
                STATUS_STAMP[check.verdict.status].color === "risk" && "text-risk",
                STATUS_STAMP[check.verdict.status].color === "verified" &&
                  "text-verified",
                STATUS_STAMP[check.verdict.status].color === "pending" &&
                  "text-pending",
              )}
            >
              {STATUS_STAMP[check.verdict.status].label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
