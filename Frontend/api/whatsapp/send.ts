import type { VercelRequest, VercelResponse } from "@vercel/node";

type SendBody = {
  to?: string;
  body?: string;
};

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

  const { to, body } = (req.body ?? {}) as SendBody;
  if (!to || !body) {
    return res.status(400).json({ error: "Missing to or body" });
  }

  const graphRes = await fetch(
    `https://graph.facebook.com/v21.0/${phoneId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    },
  );

  const text = await graphRes.text();
  res.status(graphRes.status).setHeader("Content-Type", "application/json");
  return res.send(text);
}
