import { MOCK_VERDICTS } from "@/data/mockVerdicts";
import { cn } from "@/lib/cn";

const WHATSAPP_NUMBER =
  import.meta.env.VITE_WHATSAPP_NUMBER ?? "15551709431";

const WHATSAPP_NUMBER_DISPLAY =
  import.meta.env.VITE_WHATSAPP_NUMBER_DISPLAY ?? "+1 (555) 170-9431";

export function WhatsAppMockup({ className }: { className?: string }) {
  const verdict = MOCK_VERDICTS.scam;

  return (
    <div className={cn("mx-auto max-w-[280px]", className)}>
      <div className="overflow-hidden rounded-[24px] border-2 border-ink/20 bg-paper">
        <div className="bg-ink px-4 py-3">
          <p className="font-sans text-sm font-medium text-paper">SafeLine Bot</p>
          <p className="font-mono text-xs text-paper/60">online</p>
        </div>
        <div className="space-y-3 bg-[#e5ddd5] p-4 min-h-[320px]">
          <div className="ml-auto max-w-[85%] rounded-[10px] rounded-tr-none bg-[#dcf8c6] px-3 py-2">
            <p className="font-sans text-xs text-ink leading-relaxed">
              {verdict.input_text.slice(0, 120)}…
            </p>
            <p className="mt-1 text-right font-mono text-[10px] text-ink/40">
              10:42
            </p>
          </div>
          <div className="max-w-[90%] rounded-[10px] rounded-tl-none bg-white px-3 py-2 border border-line">
            <p className="font-sans text-xs font-medium text-ink mb-1">
              🟥 SafeLine verdict: HIGH RISK
            </p>
            <p className="font-sans text-xs text-ink/70 leading-relaxed">
              {verdict.recommended_action}
            </p>
            <p className="mt-1 font-mono text-[10px] text-ink/40">10:42</p>
          </div>
        </div>
      </div>
      <p className="mt-4 text-center font-sans text-sm text-ink/60">
        Save <span className="font-mono text-ink">{WHATSAPP_NUMBER_DISPLAY}</span> or{" "}
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}`}
          className="text-verified underline underline-offset-2"
          target="_blank"
          rel="noopener noreferrer"
        >
          tap to open chat
        </a>
        <span className="block mt-1 text-xs text-ink/45">
          Forward text or send a screenshot — we read it and check live sources.
        </span>
      </p>
    </div>
  );
}

export { WHATSAPP_NUMBER, WHATSAPP_NUMBER_DISPLAY };
