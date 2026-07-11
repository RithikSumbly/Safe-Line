import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { extractUrls, urlHostname } from "@/lib/extractUrls";
import { cn } from "@/lib/cn";

const LINE_HEIGHT_PX = 24;
const MAX_LINES = 6;
const MAX_HEIGHT_PX = LINE_HEIGHT_PX * MAX_LINES;

interface ChatComposerProps {
  onSend: (text: string) => void;
  loading: boolean;
  className?: string;
}

export function ChatComposer({ onSend, loading, className }: ChatComposerProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const urls = useMemo(() => extractUrls(text), [text]);
  const canSend = Boolean(text.trim()) && !loading;

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, MAX_HEIGHT_PX);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT_PX ? "auto" : "hidden";
  }, [text]);

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
        <div className="flex items-end gap-3">
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste or forward a suspicious message…"
            rows={2}
            className="min-h-[48px] flex-1 resize-none py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verified/35 focus-visible:ring-offset-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button
            type="submit"
            disabled={!canSend}
            className={cn(
              "shrink-0 disabled:pointer-events-none disabled:opacity-100",
              canSend
                ? "bg-verified text-paper hover:bg-verified/90"
                : "border border-line bg-ink/10 text-ink/35 hover:bg-ink/10",
            )}
          >
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
