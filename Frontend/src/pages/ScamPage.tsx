import { useState } from "react";
import { ResultPanel } from "@/components/ResultPanel";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HERO_SCAM_EXAMPLE } from "@/data/mockVerdicts";
import { useContentCheck } from "@/hooks/useContentCheck";

export function ScamPage() {
  const [text, setText] = useState(HERO_SCAM_EXAMPLE);
  const [url, setUrl] = useState("");
  const { state, verdict, error, checkKey, runCheck } = useContentCheck("scam");

  return (
    <ToolPageLayout
      title="Scam Message Checker"
      intro="Checks pasted SMS, email, and chat messages against Google Safe Browsing, VirusTotal, and RBI consumer advisories for phishing and impersonation patterns."
      inputPanel={
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            runCheck({ text, url: url || undefined });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="scam-text">Message text</Label>
            <Textarea
              id="scam-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the suspicious message here"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scam-url">Link in message (optional)</Label>
            <Input
              id="scam-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://"
            />
          </div>
          <Button type="submit" className="w-full sm:w-auto">
            Check this message
          </Button>
        </form>
      }
      resultPanel={
        <ResultPanel
          state={state}
          verdict={verdict}
          error={error}
          checkKey={checkKey}
        />
      }
    />
  );
}
