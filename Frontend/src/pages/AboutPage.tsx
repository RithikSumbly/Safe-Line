import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-14 md:py-20">
      <h1 className="font-display text-3xl font-semibold text-ink md:text-4xl">
        Responsible use
      </h1>
      <div className="mt-8 space-y-6 font-sans text-base text-ink/80 leading-relaxed">
        <p>
          SafeLine is built to help you pause before acting on suspicious
          messages, offers, rumors, or contract clauses. It is a research aid,
          not an authority.
        </p>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink">
            What we never do
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-ink/70">
            <li>Ask for your OTP, password, or banking PIN</li>
            <li>Guarantee that a message is safe or unsafe without citing sources</li>
            <li>Replace emergency services, lawyers, or your bank&apos;s fraud desk</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink">
            How we reach verdicts
          </h2>
          <p className="mt-3 text-ink/70">
            Each check cross-references public databases and official advisories
            — Google Safe Browsing, VirusTotal, Google Fact Check Tools, NewsAPI,
            India Code, NALSA, RBI notices, and disaster management bulletins.
            When evidence is thin, we say so and flag the result for human review.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink">
            Domain-specific notes
          </h2>
          <ul className="mt-3 space-y-4 text-ink/70">
            <li>
              <strong className="font-medium text-ink">Scam messages:</strong>{" "}
              Do not click links in messages you are checking. Contact your bank
              using the number on your card if you are unsure.
            </li>
            <li>
              <strong className="font-medium text-ink">Job offers:</strong>{" "}
              Confirm any role on the employer&apos;s official careers site before
              paying fees or sharing documents.
            </li>
            <li>
              <strong className="font-medium text-ink">Crisis rumors:</strong>{" "}
              In a real emergency, follow instructions from local authorities
              and official alerts — not forwarded messages.
            </li>
            <li>
              <strong className="font-medium text-ink">Rental agreements:</strong>{" "}
              Clause analysis is informational. Have a qualified lawyer review
              your full agreement before signing.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink">
            Report fraud and get help
          </h2>
          <ul className="mt-3 space-y-2 font-mono text-sm text-ink/70">
            <li>
              <a
                href="https://cybercrime.gov.in"
                className="text-verified hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                cybercrime.gov.in
              </a>{" "}
              — National Cyber Crime Reporting Portal
            </li>
            <li>
              <span className="text-ink">1930</span> — National cyber fraud
              helpline (financial fraud)
            </li>
            <li>
              <a
                href="https://nalsa.gov.in"
                className="text-verified hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                nalsa.gov.in
              </a>{" "}
              — NALSA legal aid (15100)
            </li>
          </ul>
        </section>
      </div>

      <Button variant="outline" className="mt-10" asChild>
        <Link to="/">Back to home</Link>
      </Button>
    </div>
  );
}
