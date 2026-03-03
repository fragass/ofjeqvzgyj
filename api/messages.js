export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: "Supabase not configured" });
  }

  const endpoint = `${SUPABASE_URL}/rest/v1/messages`;

  // helpers
  const num = (v, def) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
  };

  if (req.method === "GET") {
    try {
      const afterId = num(req.query.after_id, 0);
      const limit = Math.min(Math.max(num(req.query.limit, 0), 0), 500) || 0;
      const recent = String(req.query.recent || "") === "1";

      // base select
      let url = `${endpoint}?select=*`;

      if (afterId > 0) {
        // incremental: só novas
        url += `&id=gt.${afterId}&order=created_at.asc`;
        if (limit) url += `&limit=${limit}`;
      } else if (recent) {
        // pega últimas N: desc no supabase e depois o front renderiza na ordem que vier (vamos retornar asc)
        // estratégia: buscar desc e inverter aqui no API pra retornar asc
        const lim = limit || 200;
        const r = await fetch(
          `${endpoint}?select=*&order=created_at.desc&limit=${lim}`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
          }
        );

        const data = await r.json();
        if (!r.ok) return res.status(r.status).json(data);

        const asc = Array.isArray(data) ? data.slice().reverse() : data;
        return res.status(200).json(asc);
      } else {
        // compat original (tudo)
        url += `&order=created_at.asc`;
      }

      const response = await fetch(url, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });

      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "POST") {
    const { name, content, image_url, to = null, reply_to = null, reply_preview = null } = req.body;

    if (!name || (!content && !image_url)) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const body = { name, content: content || "🖼 Imagem", to };

    if (image_url) body.image_url = image_url;
    if (reply_to !== undefined) body.reply_to = reply_to;
    if (reply_preview !== undefined) body.reply_preview = reply_preview;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(body),
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
