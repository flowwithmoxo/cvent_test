// Vercel Serverless Function to relay completion to Moxo
// POST body expected: { conversation_id: string, transobject_id: string }

export default async function handler(req, res) {
  // Basic CORS (useful if you ever test from another origin)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { conversation_id, transobject_id } = body;

    if (!conversation_id || !transobject_id) {
      return res.status(400).json({ error: "Missing conversation_id or transobject_id" });
    }

    const ENDPOINT =
      process.env.MOXO_ENDPOINT ||
      "https://pavan-demo.moxo.com/v1/completeTransobject";

    // Optional Basic Auth (set in Vercel Project → Settings → Environment Variables)
    const user = process.env.BASIC_AUTH_USER || "";
    const pass = process.env.BASIC_AUTH_PASS || "";
    const headers = { "Content-Type": "application/json" };
    if (user && pass) {
      const token = Buffer.from(`${user}:${pass}`).toString("base64");
      headers["Authorization"] = `Basic ${token}`;
    }

    const upstream = await fetch(ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify({ conversation_id, transobject_id }),
    });

    const text = await upstream.text(); // capture any upstream message

    if (!upstream.ok) {
      console.error("Moxo webhook error:", upstream.status, text);
      return res.status(502).json({ error: "Moxo rejected request", detail: text });
    }

    return res.status(200).json({ success: true, detail: text || "completed" });
  } catch (err) {
    console.error("Relay exception:", err);
    return res.status(500).json({ error: "Server error", detail: err?.message || String(err) });
  }
}
