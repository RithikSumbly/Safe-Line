import { MapPin } from "lucide-react";
import { useState } from "react";
import { ResultPanel } from "@/components/ResultPanel";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MOCK_VERDICTS } from "@/data/mockVerdicts";
import { useContentCheck } from "@/hooks/useContentCheck";

export function CrisisPage() {
  const [text, setText] = useState(MOCK_VERDICTS.crisis_rumor.input_text);
  const [location, setLocation] = useState("");
  const [locating, setLocating] = useState(false);
  const { state, verdict, error, checkKey, runCheck } =
    useContentCheck("crisis_rumor");

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocation("Geolocation not available in this browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation(
          `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
        );
        setLocating(false);
      },
      () => {
        setLocation("");
        setLocating(false);
      },
    );
  };

  return (
    <ToolPageLayout
      title="Crisis Rumor Checker"
      intro="Verifies forwarded claims against Google Fact Check Tools, NewsAPI reports, and official disaster management bulletins such as Kerala SDMA and PIB Fact Check."
      inputPanel={
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            runCheck({ text, location: location || undefined });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="crisis-text">Claim or forwarded message</Label>
            <Textarea
              id="crisis-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the rumor or emergency forward"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="crisis-location">Location</Label>
            <div className="flex gap-2">
              <Input
                id="crisis-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City or district name"
              />
              <Button
                type="button"
                variant="outline"
                onClick={useMyLocation}
                disabled={locating}
                aria-label="Use my location"
              >
                <MapPin className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button type="submit" className="w-full sm:w-auto">
            Check this claim
          </Button>
        </form>
      }
      resultPanel={
        <ResultPanel
          state={state}
          verdict={verdict}
          error={error}
          checkKey={checkKey}
          emptyMessage="Paste a forward above and press Check this claim to see a cited verdict here."
        />
      }
    />
  );
}
