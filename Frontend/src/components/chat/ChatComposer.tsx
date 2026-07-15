import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { extractUrls, urlHostname } from "@/lib/extractUrls";
import { fileToChatImage } from "@/lib/chatImage";
import { looksLikeLiveCheck } from "@/lib/chatIntent";
import { cn } from "@/lib/cn";
import type { ChatSendPayload } from "@/hooks/useChatSession";

const LINE_HEIGHT_PX = 24;
const MAX_LINES = 6;
const MAX_HEIGHT_PX = LINE_HEIGHT_PX * MAX_LINES;

interface AttachedImage {
  dataUrl: string;
  base64: string;
  mimeType: string;
}

interface ChatComposerProps {
  onSend: (payload: ChatSendPayload) => void;
  loading: boolean;
  pendingKind?: "idle" | "reply" | "check";
  className?: string;
}

export function ChatComposer({
  onSend,
  loading,
  pendingKind = "idle",
  className,
}: ChatComposerProps) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<AttachedImage | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urls = useMemo(() => extractUrls(text), [text]);
  const hasText = text.trim().length > 0;
  const canSend = (hasText || Boolean(image)) && !loading;

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, MAX_HEIGHT_PX);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT_PX ? "auto" : "hidden";
  }, [text]);

  const attachFile = async (file: File) => {
    setAttachError(null);
    try {
      const prepared = await fileToChatImage(file);
      setImage(prepared);
    } catch (e) {
      setAttachError(e instanceof Error ? e.message : "Could not attach image.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if ((!trimmed && !image) || loading) return;
    onSend({
      text: trimmed,
      imageDataUrl: image?.dataUrl,
      imageBase64: image?.base64,
      imageMimeType: image?.mimeType,
    });
    setText("");
    setImage(null);
    setAttachError(null);
  };

  const buttonLabel =
    pendingKind === "check"
      ? "Checking…"
      : pendingKind === "reply"
        ? "Replying…"
        : looksLikeLiveCheck(text, Boolean(image))
          ? "Check"
          : "Send";

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "shrink-0 border-t border-[var(--chat-border)] p-4",
        className,
      )}
      aria-label="Compose message"
    >
      {urls.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2" aria-label="Detected links">
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
      {image && (
        <div className="mb-3 flex items-start gap-3">
          <div className="relative overflow-hidden rounded-md border border-line">
            <img
              src={image.dataUrl}
              alt="Screenshot to check"
              className="max-h-28 max-w-[12rem] object-contain"
            />
            <button
              type="button"
              onClick={() => setImage(null)}
              className="a11y-control absolute right-1 top-1 rounded bg-ink/80 px-2 py-1 font-mono text-[10px] text-paper"
              aria-label="Remove screenshot"
            >
              ✕
            </button>
          </div>
          <p className="font-mono text-[10px] text-ink/55" id="compose-image-hint">
            Screenshot ready — we will read the text and check it.
          </p>
        </div>
      )}
      {attachError && (
        <p className="mb-2 font-sans text-xs text-risk" role="alert" id="compose-attach-error">
          {attachError}
        </p>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          id="chat-screenshot-input"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void attachFile(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => fileInputRef.current?.click()}
          className="a11y-control inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] border border-[var(--chat-border)] bg-[var(--chat-panel-bg)] text-ink/70 transition-colors hover:border-ink/30 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Attach screenshot"
          title="Attach screenshot"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="8.5" cy="10" r="1.5" />
            <path d="M21 15l-5-5L5 19" />
          </svg>
        </button>
        <label htmlFor="chat-message-input" className="sr-only">
          Message to check
        </label>
        <Textarea
          id="chat-message-input"
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste a message or screenshot…"
          rows={2}
          aria-describedby={
            [attachError ? "compose-attach-error" : null, image ? "compose-image-hint" : null, "compose-hints"]
              .filter(Boolean)
              .join(" ") || undefined
          }
          className="min-h-[48px] flex-1 resize-none border-[var(--chat-border)] bg-[var(--chat-panel-bg)] py-2.5 focus:border-[var(--color-cta)] focus:outline-none focus:ring-2 focus:ring-[var(--color-cta)] focus:ring-offset-1"
          onPaste={(e) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (const item of items) {
              if (item.type.startsWith("image/")) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) void attachFile(file);
                break;
              }
            }
          }}
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
            "btn-cta a11y-control inline-flex h-11 shrink-0 items-center justify-center rounded-[6px] px-4 font-sans text-sm font-medium transition-colors",
            !canSend && "cursor-not-allowed",
          )}
        >
          {buttonLabel}
        </button>
      </div>
      <p id="compose-hints" className="mt-2 font-mono text-[10px] text-ink/70">
        Enter to send · Shift+Enter for new line · Paste or attach a screenshot
      </p>
    </form>
  );
}
