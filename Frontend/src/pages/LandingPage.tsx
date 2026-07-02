import { Link } from "react-router-dom";
import { AnnotatedVerdictCard } from "@/components/AnnotatedVerdictCard";
import { HeroLiveDemo } from "@/components/HeroLiveDemo";
import { ScrollReveal } from "@/components/ScrollReveal";
import { SourceTagRow } from "@/components/SourceTagRow";
import { StatsStrip } from "@/components/StatsStrip";
import { WHATSAPP_NUMBER, WhatsAppMockup } from "@/components/WhatsAppMockup";
import { Button } from "@/components/ui/button";
import { MOCK_VERDICTS } from "@/data/mockVerdicts";
import { cn } from "@/lib/cn";

const STEPS = [
  "Paste or forward the suspicious message, offer, or document",
  "We cross-check against real sources — not guesses",
  "You get a cited verdict with flagged phrases",
  "You get a clear next step before you act",
];

const CHECKERS = [
  {
    to: "/scam",
    num: "01",
    title: "Scam message",
    desc: "Phishing SMS, fake bank alerts, impersonation links",
    accent: "index-row-risk",
    numColor: "text-risk",
  },
  {
    to: "/jobs",
    num: "02",
    title: "Fake job offer",
    desc: "Upfront-fee offers, impersonated employer recruiting",
    accent: "index-row-pending",
    numColor: "text-pending",
  },
  {
    to: "/crisis",
    num: "03",
    title: "Crisis rumor",
    desc: "Forwarded emergency claims vs official bulletins",
    accent: "index-row-risk",
    numColor: "text-risk",
  },
  {
    to: "/rental",
    num: "04",
    title: "Rental agreement",
    desc: "One-sided clauses vs tenancy law references",
    accent: "index-row-verified",
    numColor: "text-verified",
  },
];

export function LandingPage() {
  return (
    <>
      <section className="border-b border-line bg-gradient-to-br from-verified-soft/80 via-paper to-paper">
        <div className="content-shell py-12 md:py-16">
          <ScrollReveal>
            <p className="kicker">Verification desk</p>
            <h1 className="mt-3 max-w-[14ch] font-display text-[2.5rem] leading-[1.08] text-ink md:text-[3.25rem]">
              Before you click, pay, or forward — check it here
            </h1>
            <p className="measure mt-6 font-sans text-base leading-relaxed text-ink/55 md:text-[1.05rem]">
              SafeLine cross-checks suspicious messages and documents against
              cited public sources, then records a plain-language verdict with
              named references.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Button asChild>
                <Link to="/scam">Check a message</Link>
              </Button>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-ink/55 underline underline-offset-4 hover:text-ink"
              >
                Forward on WhatsApp instead
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <StatsStrip />

      <section className="section-verified border-b border-line">
        <div className="content-shell py-10 md:py-12">
          <ScrollReveal>
            <HeroLiveDemo />
          </ScrollReveal>
        </div>
      </section>

      <section className="border-b border-line bg-paper py-12 md:py-14">
        <div className="content-shell">
          <ScrollReveal>
            <p className="kicker">Procedure</p>
            <h2 className="mt-2 font-display text-2xl text-ink md:text-[1.75rem]">
              How it works
            </h2>
          </ScrollReveal>
          <ol className="mt-8 divide-y divide-line border-y border-line">
            {STEPS.map((step, i) => {
              const numColors = [
                "text-verified",
                "text-pending",
                "text-risk",
                "text-verified",
              ];
              return (
                <li key={step}>
                  <ScrollReveal>
                    <div className="grid grid-cols-[3rem_1fr] gap-4 bg-paper py-5 even:bg-verified-soft/25 md:grid-cols-[4rem_1fr]">
                      <span
                        className={cn(
                          "font-mono text-sm font-medium",
                          numColors[i],
                        )}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <p className="font-sans text-sm leading-relaxed text-ink/75 md:text-base">
                        {step}
                      </p>
                    </div>
                  </ScrollReveal>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="border-b border-line py-12 md:py-14">
        <div className="content-shell">
          <ScrollReveal>
            <p className="kicker">Index</p>
            <h2 className="mt-2 font-display text-2xl text-ink md:text-[1.75rem]">
              Four checkers, one desk
            </h2>
          </ScrollReveal>
          <div className="mt-6 border-t border-line">
            {CHECKERS.map(({ to, num, title, desc, accent, numColor }) => (
              <ScrollReveal key={to}>
                <Link
                  to={to}
                  className={cn("index-row group block", accent)}
                >
                  <div className="flex min-w-0 flex-1 items-baseline gap-4">
                    <span
                      className={cn(
                        "shrink-0 font-mono text-xs font-medium",
                        numColor,
                      )}
                    >
                      {num}
                    </span>
                    <div>
                      <span className="font-display text-lg text-ink group-hover:underline group-hover:decoration-ink/25 group-hover:underline-offset-4">
                        {title}
                      </span>
                      <p className="mt-0.5 font-sans text-sm text-ink/50">
                        {desc}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-xs text-ink/40 group-hover:text-ink">
                    Open →
                  </span>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pending border-b border-line py-12 md:py-14">
        <div className="content-shell">
          <ScrollReveal>
            <p className="kicker">Evidence standard</p>
            <h2 className="mt-2 font-display text-2xl text-ink md:text-[1.75rem]">
              Every verdict is cited
            </h2>
            <p className="measure mt-3 font-sans text-sm leading-relaxed text-ink/55">
              We name the databases and advisories consulted. When evidence is
              thin, the verdict says so.
            </p>
          </ScrollReveal>
          <ScrollReveal className="mt-8">
            <AnnotatedVerdictCard
              verdict={MOCK_VERDICTS.scam}
              condensed
              animate={false}
            />
          </ScrollReveal>
          <SourceTagRow className="mt-8" />
        </div>
      </section>

      <section className="section-verified py-12 md:py-14">
        <div className="content-shell grid gap-10 md:grid-cols-2 md:items-start">
          <ScrollReveal>
            <p className="kicker">Field channel</p>
            <h2 className="mt-2 font-display text-2xl text-ink md:text-[1.75rem]">
              Check on WhatsApp
            </h2>
            <p className="measure mt-4 font-sans text-sm leading-relaxed text-ink/55">
              Forward a suspicious message to our bot. You receive a condensed
              verdict with a risk marker and a recommended next step — the same
              sources, in your chat.
            </p>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-block font-mono text-xs text-verified underline underline-offset-4 hover:text-ink"
            >
              Open WhatsApp desk →
            </a>
            <p className="mt-4 font-mono text-[11px] text-ink/40">
              Save +{WHATSAPP_NUMBER} or tap the link above to start.
            </p>
          </ScrollReveal>
          <ScrollReveal>
            <WhatsAppMockup />
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
