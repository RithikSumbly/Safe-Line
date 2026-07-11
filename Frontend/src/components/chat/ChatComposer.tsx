import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { extractUrls, urlHostname } from "@/lib/extractUrls";
import { cn } from "@/lib/cn";

interface ChatComposerProps {
  onSend: (text: string) => void;
  loading: boolean;
  className?: string;
}

export function ChatComposer({ onSend, loading, className }: ChatComposerProps) {
  const [text, setText] = useState("");
  const urls = useMemo(() => extractUrls(text), [text]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    setText("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "border-t border-line bg-paper/95 px-4 py-4 backdrop-blur-sm md:px-6",
        className,
      )}
    >
      <div className="mx-auto max-w-3xl space-y-3">
        {urls.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {urls.map((url) => (
              <span
                key={url}
                className="rounded-full border border-verified/30 bg-verified/[0.08] px-3 py-1 font-mono text-[10px] text-verified"
              >
                Link: {urlHostname(url)}
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-3 items-end">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste or forward a suspicious message…"
            rows={3}
            className="min-h-[80px] flex-1 resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button type="submit" disabled={loading || !text.trim()} className="shrink-0">
            {loading ? "Checking…" : "Send"}
          </Button>
        </div>
        <p className="font-mono text-[10px] text-ink/40">
          Enter to send · Shift+Enter for new line · Links detected automatically
        </p>
      </div>
    </form>
  );
}
