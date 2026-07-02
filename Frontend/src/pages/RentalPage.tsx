import type { DragEvent } from "react";
import { FileText, Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { ResultPanel } from "@/components/ResultPanel";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MOCK_VERDICTS } from "@/data/mockVerdicts";
import { useContentCheck } from "@/hooks/useContentCheck";
import { cn } from "@/lib/cn";

const STATES = [
  "Andhra Pradesh",
  "Delhi",
  "Gujarat",
  "Karnataka",
  "Kerala",
  "Maharashtra",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "West Bengal",
];

export function RentalPage() {
  const [text, setText] = useState(MOCK_VERDICTS.rental_redflag.input_text);
  const [jurisdiction, setJurisdiction] = useState("Kerala");
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const { state, verdict, error, checkKey, runCheck } =
    useContentCheck("rental_redflag");

  const onFile = useCallback((file: File | undefined) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      return;
    }
    setFileName(file.name);
    setFile(file);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      onFile(e.dataTransfer.files[0]);
    },
    [onFile],
  );

  return (
    <ToolPageLayout
      title="Rental Agreement Checker"
      intro="Flags one-sided clauses against India Code rent statutes, NALSA tenant guidance, and the Model Tenancy Act framework. Upload a PDF or paste clause text."
      inputPanel={
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            runCheck({
              text,
              jurisdiction,
              fileName: fileName ?? undefined,
              file: file ?? undefined,
            });
          }}
        >
          <div className="space-y-2">
            <Label>Agreement document</Label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={cn(
                "relative rounded-[10px] border-2 border-dashed p-8 text-center transition-colors",
                dragOver ? "border-ink bg-ink/5" : "border-line",
              )}
            >
              <input
                type="file"
                accept="application/pdf"
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={(e) => onFile(e.target.files?.[0])}
                aria-label="Upload rental agreement PDF"
              />
              <Upload className="mx-auto h-8 w-8 text-ink/40" strokeWidth={1.5} />
              <p className="mt-3 font-sans text-sm text-ink">
                Drop PDF here or click to upload
              </p>
              <p className="mt-1 font-mono text-xs text-ink/40">
                Case-file intake · PDF only
              </p>
              {fileName && (
                <p className="mt-3 inline-flex items-center gap-2 font-mono text-xs text-ink">
                  <FileText className="h-4 w-4" />
                  {fileName}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rental-text">Or paste clause text</Label>
            <Textarea
              id="rental-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste suspicious clauses from your agreement"
              className="min-h-[120px]"
            />
          </div>

          <div className="space-y-2">
            <Label>State / jurisdiction</Label>
            <Select value={jurisdiction} onValueChange={setJurisdiction}>
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {STATES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full sm:w-auto">
            Check this agreement
          </Button>
        </form>
      }
      resultPanel={
        <ResultPanel
          state={state}
          verdict={verdict}
          error={error}
          checkKey={checkKey}
          emptyMessage="Upload or paste an agreement above and press Check this agreement to see flagged clauses."
        />
      }
    />
  );
}
