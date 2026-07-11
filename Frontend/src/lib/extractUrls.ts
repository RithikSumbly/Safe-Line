const URL_RE = /https?:\/\/[^\s<>"']+/gi;

export function extractUrls(text: string): string[] {
  const matches = text.match(URL_RE) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of matches) {
    const trimmed = url.replace(/[.,;:!?)]+$/, "");
    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      out.push(trimmed);
    }
  }
  return out;
}

export function urlHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
