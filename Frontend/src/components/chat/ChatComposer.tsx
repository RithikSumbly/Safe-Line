import { useLayoutEffect, useMemo, useRef, useState } from "react";
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
  const hasText = text.trim().length > 0;
  const canSend = hasText && !loading;

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
        "shrink-0 border-t border-[var(--chat-border)] p-4",
        className,
      )}
    >
      {urls.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
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
          className="min-h-[48px] flex-1 resize-none border-[var(--chat-border)] bg-[var(--chat-panel-bg)] py-2.5 focus:border-[var(--color-cta)] focus:outline-none focus:ring-2 focus:ring-[var(--color-cta)] focus:ring-offset-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <button
          type="submit"
          disabled={!canSend}
          className={cn(
            "btn-cta inline-flex h-10 shrink-0 items-center justify-center rounded-[6px] px-4 font-sans text-sm font-medium transition-colors",
            !canSend && "cursor-not-allowed",
          )}
        >
          {loading ? "Checking…" : "Send"}
        </button>
      </div>
      <p className="mt-2 font-mono text-[10px] text-ink/40">
        Enter to send · Shift+Enter for new line · Links detected automatically
      </p>
    </form>
  );
}
