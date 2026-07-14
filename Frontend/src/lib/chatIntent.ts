/** Whether the pending request is likely a live source check (vs a short reply). */
export function looksLikeLiveCheck(text: string, hasImage = false): boolean {
  if (hasImage) return true;
  const stripped = text.trim();
  if (!stripped) return false;
  if (/^(hi|hello|hey|help|start|thanks|thank\s*you|ok|okay)[\s!.?]*$/i.test(stripped)) {
    return false;
  }
  if (
    /\b(how\s+(?:does|do|can|to)|what\s+(?:is|are)|why\s+(?:do|does)|explain|tell\s+me\s+about)\b/i.test(
      stripped,
    ) &&
    stripped.length < 100 &&
    !/https?:\/\//i.test(stripped)
  ) {
    return false;
  }
  if (stripped.length >= 40) return true;
  if (/https?:\/\/|www\./i.test(stripped)) return true;
  return (
    /\b(won|lottery|prize|otp|kyc|upi|scam|phish|job|offer|flood|suspicious|click|verify|rupee|rs\.?\s*\d)\b/i.test(
      stripped,
    ) && stripped.length >= 15
  );
}

export type PendingKind = "idle" | "reply" | "check";
