import type { VercelRequest, VercelResponse } from "@vercel/node";

type RelayBody = {
  action?: "send" | "send_message" | "download_media";
  to?: string;
  body?: string;
  media_id?: string;
  /** Full WhatsApp message fields (type, text, interactive, …) without messaging_product/to */
  message?: Record<string, unknown>;
};

/**
 * Server-side Meta Graph helper for HF Spaces (which cannot TLS reliably
 * to graph.facebook.com). Supports text send, interactive menus, and media fetch.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const relaySecret = process.env.WHATSAPP_RELAY_SECRET;
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneId = process.env.META_PHONE_NUMBER_ID;

  if (!relaySecret || !token || !phoneId) {
    return res.status(500).json({ error: "WhatsApp relay is not configured" });
  }

  const provided = req.headers["x-relay-secret"];
  if (provided !== relaySecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const payload = (req.body ?? {}) as RelayBody;
  const action = payload.action ?? "send";

  if (action === "download_media") {
    const mediaId = payload.media_id?.trim();
    if (!mediaId) {
      return res.status(400).json({ error: "Missing media_id" });
    }

    try {
      const metaRes = await fetch(
        `https://graph.facebook.com/v21.0/${encodeURIComponent(mediaId)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const metaText = await metaRes.text();
      if (!metaRes.ok) {
        res.status(metaRes.status).setHeader("Content-Type", "application/json");
        return res.send(metaText);
      }

      const metaJson = JSON.parse(metaText) as {
        url?: string;
        mime_type?: string;
      };
      if (!metaJson.url) {
        return res.status(502).json({ error: "Media URL missing from Meta" });
      }

      const fileRes = await fetch(metaJson.url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!fileRes.ok) {
        const errText = await fileRes.text();
        return res.status(fileRes.status).json({
          error: "Media download failed",
          detail: errText.slice(0, 300),
        });
      }

      const buf = Buffer.from(await fileRes.arrayBuffer());
      const mimeType =
        metaJson.mime_type ||
        fileRes.headers.get("content-type") ||
        "image/jpeg";

      return res.status(200).json({
        mime_type: mimeType,
        size: buf.length,
        data_base64: buf.toString("base64"),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Media relay failed";
      return res.status(502).json({ error: message });
    }
  }

  const to = payload.to;
  if (!to) {
    return res.status(400).json({ error: "Missing to" });
  }

  let graphBody: Record<string, unknown>;
  if (action === "send_message" && payload.message) {
    graphBody = {
      messaging_product: "whatsapp",
      to,
      ...payload.message,
    };
  } else if (payload.body) {
    graphBody = {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: payload.body },
    };
  } else {
    return res.status(400).json({ error: "Missing body or message" });
  }

  const graphRes = await fetch(
    `https://graph.facebook.com/v21.0/${phoneId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(graphBody),
    },
  );

  const text = await graphRes.text();
  res.status(graphRes.status).setHeader("Content-Type", "application/json");
  return res.send(text);
}
