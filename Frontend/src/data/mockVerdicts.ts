import type { AgentType, AnnotatedVerdict, CheckInput } from "@/types/agent";

const SCAM_INPUT = `HDFC BANK ALERT: Your KYC is pending verification. Update immediately to avoid account suspension within 24 hours. Click here: hdfc-kyc-update.secure-portal.in/verify?id=88421`;

const JOB_INPUT = `Congratulations! You are selected for Remote Data Entry at Amazon Services India. No interview required. Pay ₹499 registration fee via UPI to confirm your offer letter. Reply YES to accept. Contact: hr.amazon-hiringdesk@gmail.com`;

const CRISIS_INPUT = `URGENT FORWARD TO ALL GROUPS: Mullaperiyar dam has developed cracks. Water will flood Ernakulam and Aluva by tonight. Evacuate immediately. Do not trust govt silence. Share widely before they delete this. - Local volunteer network`;

export const HERO_SCAM_EXAMPLE = SCAM_INPUT;

export const MOCK_VERDICTS: Record<AgentType, AnnotatedVerdict> = {
  scam: {
    agent: "scam",
    status: "high_risk",
    confidence: 0.91,
    risk_score: 87,
    red_flags: [
      "Domain mimics HDFC but is not registered to HDFC Bank",
      "Urgency language and account suspension threat",
      "Shortened third-party link not on bank's official domain",
    ],
    evidence: [
      {
        source_name: "Google Safe Browsing",
        source_url: "https://safebrowsing.google.com/",
        supports_claim: false,
        snippet:
          "URL hdfc-kyc-update.secure-portal.in flagged as phishing in the last 48 hours.",
      },
      {
        source_name: "VirusTotal",
        source_url: "https://www.virustotal.com/",
        supports_claim: false,
        snippet:
          "4 security vendors classify the linked domain as malicious or phishing.",
      },
      {
        source_name: "RBI Consumer Awareness",
        source_url:
          "https://www.rbi.org.in/Scripts/BS_ViewMasCirculardetails.aspx",
        supports_claim: false,
        snippet:
          "RBI advisories state banks do not ask for KYC updates via SMS links.",
      },
      {
        source_name: "HDFC Bank Official",
        source_url: "https://www.hdfcbank.com/",
        supports_claim: false,
        snippet:
          "Official HDFC domains use hdfcbank.com; this link does not match.",
      },
    ],
    explanation:
      "This message uses impersonation of HDFC Bank, urgency tactics, and a non-official link — a common KYC phishing pattern reported to cybercrime portals.",
    recommended_action:
      "Do not click the link. Delete the message and report it at cybercrime.gov.in or call 1930.",
    needs_human_review: false,
    disclaimer:
      "Automated check only. For account issues, contact your bank using the number on your card or passbook.",
    input_text: SCAM_INPUT,
    flagged_spans: [
      { start: 0, end: 15, tag: 1, severity: "risk" },
      { start: 16, end: 52, tag: 2, severity: "risk" },
      { start: 53, end: 108, tag: 3, severity: "risk" },
      { start: 109, end: 168, tag: 4, severity: "risk" },
    ],
  },

  job_offer: {
    agent: "job_offer",
    status: "high_risk",
    confidence: 0.94,
    risk_score: 92,
    red_flags: [
      "Upfront registration fee before employment",
      "No interview for a branded employer role",
      "Sender uses Gmail, not corporate domain",
      "Unsolicited offer with pressure to reply",
    ],
    evidence: [
      {
        source_name: "Google Safe Browsing",
        source_url: "https://safebrowsing.google.com/",
        supports_claim: false,
        snippet:
          "Pattern matches known employment-fee scam campaigns in South Asia.",
      },
      {
        source_name: "Ministry of Labour & Employment",
        source_url: "https://www.labour.gov.in/",
        supports_claim: false,
        snippet:
          "Legitimate employers do not charge registration fees for job offers.",
      },
      {
        source_name: "Amazon Careers",
        source_url: "https://www.amazon.jobs/",
        supports_claim: false,
        snippet:
          "Amazon hiring uses amazon.jobs and verified corporate email domains only.",
      },
      {
        source_name: "NewsAPI — scam reports",
        source_url: "https://newsapi.org/",
        supports_claim: false,
        snippet:
          "Recent news reports document fake Amazon work-from-home fee scams in India.",
      },
    ],
    explanation:
      "Legitimate employers do not require payment to issue offer letters. The sender domain and no-interview claim do not match Amazon's hiring process.",
    recommended_action:
      "Do not pay or reply. Block the sender and report the message to cybercrime.gov.in.",
    needs_human_review: false,
    disclaimer:
      "This check does not verify individual recruiters. Always confirm roles on the company's official careers page.",
    input_text: JOB_INPUT,
    flagged_spans: [
      { start: 18, end: 72, tag: 1, severity: "risk" },
      { start: 73, end: 95, tag: 2, severity: "risk" },
      { start: 96, end: 148, tag: 3, severity: "risk" },
      { start: 149, end: 198, tag: 4, severity: "risk" },
    ],
  },

  crisis_rumor: {
    agent: "crisis_rumor",
    status: "likely_false",
    confidence: 0.88,
    risk_score: 78,
    red_flags: [
      "Unverified forward asking for mass sharing",
      "Claims contradict official dam safety bulletin",
      "No named authority or timestamped official source",
      "Fear-based language urging distrust of government",
    ],
    evidence: [
      {
        source_name: "Google Fact Check Tools",
        source_url: "https://toolbox.google.com/factcheck/",
        supports_claim: false,
        snippet:
          "Fact-checkers rated similar Mullaperiyar flood forwards as false in 2024–2025.",
      },
      {
        source_name: "NewsAPI",
        source_url: "https://newsapi.org/",
        supports_claim: false,
        snippet:
          "No credible news outlet reported imminent Mullaperiyar breach for the cited date.",
      },
      {
        source_name: "Kerala State Disaster Management",
        source_url: "https://sdma.kerala.gov.in/",
        supports_claim: false,
        snippet:
          "Official SDMA updates did not issue evacuation orders for Ernakulam on this claim.",
      },
      {
        source_name: "PIB Fact Check",
        source_url: "https://factcheck.pib.gov.in/",
        supports_claim: false,
        snippet:
          "PIB has previously debunked viral dam-collapse messages lacking official confirmation.",
      },
    ],
    explanation:
      "The message shows hallmarks of crisis misinformation: anonymous source, call to forward widely, and claims not supported by disaster management authorities or news reports.",
    recommended_action:
      "Do not forward. Check sdma.kerala.gov.in or local district control room numbers before sharing evacuation claims.",
    needs_human_review: true,
    disclaimer:
      "In a real emergency, follow instructions from local authorities and official alerts. This tool does not replace emergency services.",
    input_text: CRISIS_INPUT,
    flagged_spans: [
      { start: 0, end: 35, tag: 1, severity: "risk" },
      { start: 36, end: 88, tag: 2, severity: "risk" },
      { start: 89, end: 130, tag: 3, severity: "risk" },
      { start: 131, end: 175, tag: 4, severity: "risk" },
    ],
  },
};

export function getMockVerdict(
  agent: AgentType,
  input: CheckInput,
): AnnotatedVerdict {
  const base = MOCK_VERDICTS[agent];
  const text = input.text.trim() || base.input_text;
  return {
    ...base,
    input_text: text,
    flagged_spans: reindexSpans(text, base.flagged_spans, base.input_text),
  };
}

function reindexSpans(
  newText: string,
  spans: AnnotatedVerdict["flagged_spans"],
  originalText: string,
): AnnotatedVerdict["flagged_spans"] {
  if (newText === originalText) return spans;
  return spans
    .map((span) => {
      const phrase = originalText.slice(span.start, span.end);
      const idx = newText.indexOf(phrase);
      if (idx === -1) return null;
      return { ...span, start: idx, end: idx + phrase.length };
    })
    .filter((s): s is AnnotatedVerdict["flagged_spans"][number] => s !== null);
}

export const ALL_SOURCE_NAMES = [
  "Google Safe Browsing",
  "VirusTotal",
  "Google Fact Check Tools",
  "NewsAPI",
  "India Code",
  "NALSA",
  "RBI",
  "HDFC Bank",
  "Amazon Careers",
  "PIB Fact Check",
  "Kerala SDMA",
];

export const MOCK_CHECK_HISTORY = [
  {
    id: "1",
    agent: "scam" as const,
    inputPreview: "HDFC BANK ALERT: Your KYC is pending…",
    status: "high_risk" as const,
    createdAt: "2026-06-28T14:22:00Z",
  },
  {
    id: "2",
    agent: "job_offer" as const,
    inputPreview: "Congratulations! Remote Data Entry at Amazon…",
    status: "high_risk" as const,
    createdAt: "2026-06-27T09:15:00Z",
  },
  {
    id: "3",
    agent: "crisis_rumor" as const,
    inputPreview: "URGENT: Mullaperiyar dam has developed cracks…",
    status: "likely_false" as const,
    createdAt: "2026-06-25T18:40:00Z",
  },
];
