import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getProfile,
  getUserChecks,
  updateWhatsAppPhone,
  type SavedCheck,
} from "@/lib/checks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AGENT_LABELS, STATUS_STAMP, type AgentType } from "@/types/agent";

export function DashboardPage() {
  const { user, signOut } = useAuth();
  const [filter, setFilter] = useState<AgentType | "all">("all");
  const [rows, setRows] = useState<SavedCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneMessage, setPhoneMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getUserChecks(user.id, {
      agent: filter === "all" ? undefined : filter,
    })
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [user, filter]);

  useEffect(() => {
    if (!user) return;
    getProfile(user.id)
      .then((p) => setPhone(p?.whatsapp_phone ?? ""))
      .catch(() => setPhone(""));
  }, [user]);

  const handleLinkPhone = async () => {
    if (!user) return;
    setPhoneSaving(true);
    setPhoneMessage(null);
    try {
      await updateWhatsAppPhone(user.id, phone);
      setPhoneMessage("Phone number saved.");
    } catch {
      setPhoneMessage("Could not save phone number. Try again.");
    } finally {
      setPhoneSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-3xl font-semibold text-ink">Dashboard</h1>
        <Button variant="outline" onClick={() => signOut()}>
          Sign out
        </Button>
      </div>

      <div className="mt-10 border border-line rounded-[12px] p-6">
        <h2 className="font-sans text-base font-medium text-ink">
          Link your WhatsApp
        </h2>
        <p className="mt-2 font-sans text-sm text-ink/60">
          Connect the phone number you use with our bot so WhatsApp checks appear
          in this dashboard.
        </p>
        <div className="mt-4 flex gap-2 max-w-sm">
          <Input
            type="tel"
            placeholder="+91"
            aria-label="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Button
            variant="outline"
            onClick={handleLinkPhone}
            disabled={phoneSaving}
          >
            Link
          </Button>
        </div>
        {phoneMessage && (
          <p className="mt-2 font-sans text-sm text-ink/60">{phoneMessage}</p>
        )}
      </div>

      <div className="mt-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-sans text-base font-medium text-ink">
            Past checks
          </h2>
          <Select
            value={filter}
            onValueChange={(v) => setFilter(v as AgentType | "all")}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All checkers</SelectItem>
              {(Object.keys(AGENT_LABELS) as AgentType[]).map((a) => (
                <SelectItem key={a} value={a}>
                  {AGENT_LABELS[a]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 overflow-x-auto border border-line rounded-[10px]">
          {loading ? (
            <p className="px-4 py-8 font-sans text-sm text-ink/60">
              Loading check history…
            </p>
          ) : rows.length === 0 ? (
            <p className="px-4 py-8 font-sans text-sm text-ink/60">
              No checks saved yet. Use a checker tool while signed in.
            </p>
          ) : (
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-4 py-3 font-sans font-medium text-ink">Input</th>
                  <th className="px-4 py-3 font-sans font-medium text-ink">Type</th>
                  <th className="px-4 py-3 font-sans font-medium text-ink">Verdict</th>
                  <th className="px-4 py-3 font-mono text-xs font-medium text-ink/60">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-sans text-ink/80 max-w-[200px] truncate">
                      {row.input_text}
                    </td>
                    <td className="px-4 py-3 font-sans text-ink/70">
                      {AGENT_LABELS[row.agent]}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      <span
                        className={
                          STATUS_STAMP[row.verdict.status].color === "risk"
                            ? "text-risk"
                            : STATUS_STAMP[row.verdict.status].color === "verified"
                              ? "text-verified"
                              : "text-pending"
                        }
                      >
                        {STATUS_STAMP[row.verdict.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink/40">
                      {new Date(row.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="mt-10 border border-line rounded-[12px] p-6">
        <h2 className="font-sans text-base font-medium text-ink">Profile</h2>
        <div className="mt-4 grid gap-4 max-w-sm">
          <div className="space-y-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input
              id="profile-email"
              type="email"
              disabled
              value={user?.email ?? ""}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
