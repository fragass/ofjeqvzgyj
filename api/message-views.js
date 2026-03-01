export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: "Supabase not configured" });
  }

  const endpoint = `${SUPABASE_URL}/rest/v1/message_views`;

  if (req.method === "GET") {
    const { message_id } = req.query;

    if (!message_id) {
      return res.status(400).json({ error: "Missing message_id" });
    }

    try {
      const response = await fetch(
        `${endpoint}?select=viewer,seen_at&message_id=eq.${encodeURIComponent(message_id)}&order=seen_at.asc`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );

      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "POST") {
    const { viewer, message_ids } = req.body;

    if (!viewer || !Array.isArray(message_ids) || !message_ids.length) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const uniqueIds = [...new Set(message_ids.filter(Boolean))];
    const payload = uniqueIds.map((message_id) => ({ message_id, viewer }));

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(500).json({ error: errText });
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}