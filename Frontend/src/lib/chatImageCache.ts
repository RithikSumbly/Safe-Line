/** Guest-session cache so screenshot bubbles survive a soft reload. */
const imagesKey = (sessionId: string) => `safeline_chat_imgs_${sessionId}`;

export function cacheSessionImage(
  sessionId: string,
  messageId: string,
  dataUrl: string,
): void {
  try {
    const raw = sessionStorage.getItem(imagesKey(sessionId));
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    map[messageId] = dataUrl;
    // Keep only the last 12 images to stay under storage quotas.
    const ids = Object.keys(map);
    if (ids.length > 12) {
      for (const id of ids.slice(0, ids.length - 12)) {
        delete map[id];
      }
    }
    sessionStorage.setItem(imagesKey(sessionId), JSON.stringify(map));
  } catch {
    // Quota / private mode — in-memory ThreadMessage still shows the image.
  }
}

export function readCachedSessionImages(
  sessionId: string,
): Record<string, string> {
  try {
    const raw = sessionStorage.getItem(imagesKey(sessionId));
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export function clearCachedSessionImages(sessionId: string): void {
  try {
    sessionStorage.removeItem(imagesKey(sessionId));
  } catch {
    /* ignore */
  }
}
