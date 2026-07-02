import { useState } from "react";
import { ResultPanel } from "@/components/ResultPanel";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MOCK_VERDICTS } from "@/data/mockVerdicts";
import { useContentCheck } from "@/hooks/useContentCheck";

export function JobsPage() {
  const [text, setText] = useState(MOCK_VERDICTS.job_offer.input_text);
  const [email, setEmail] = useState("");
  const { state, verdict, error, checkKey, runCheck } =
    useContentCheck("job_offer");

  return (
    <ToolPageLayout
      title="Fake Job Offer Checker"
      intro="Cross-checks offer text against official employer career pages, Ministry of Labour guidance, and reported employment-fee scam patterns."
      inputPanel={
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            runCheck({ text, email: email || undefined });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="job-text">Offer text</Label>
            <Textarea
              id="job-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the job offer message or email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="job-email">Sender email (optional)</Label>
            <Input
              id="job-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="recruiter@example.com"
            />
          </div>
          <Button type="submit" className="w-full sm:w-auto">
            Check this offer
          </Button>
        </form>
      }
      resultPanel={
        <ResultPanel
          state={state}
          verdict={verdict}
          error={error}
          checkKey={checkKey}
          emptyMessage="Paste an offer above and press Check this offer to see a cited verdict here."
        />
      }
    />
  );
}
