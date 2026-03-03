export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ success: false, error: "Supabase not configured" });
  }

  const endpoint = `${SUPABASE_URL}/rest/v1/private_messages`;

  const num = (v, def) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
  };

  if (req.method === "GET") {
    try {
      const room = String(req.query.room || "").trim();
      if (!room) return res.status(400).json({ success: false, error: "Missing room" });

      const afterId = num(req.query.after_id, 0);
      const limit = Math.min(Math.max(num(req.query.limit, 0), 0), 500) || 0;
      const recent = String(req.query.recent || "") === "1";

      if (afterId > 0) {
        let url = `${endpoint}?select=*&room=eq.${encodeURIComponent(room)}&id=gt.${afterId}&order=created_at.asc`;
        if (limit) url += `&limit=${limit}`;

        const r = await fetch(url, {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        });

        const data = await r.json();
        return res.status(r.status).json(data);
      }

      if (recent) {
        const lim = limit || 200;

        const r = await fetch(
          `${endpoint}?select=*&room=eq.${encodeURIComponent(room)}&order=created_at.desc&limit=${lim}`,
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
      }

      // compat: tudo asc (não recomendado em produção grande)
      const r = await fetch(
        `${endpoint}?select=*&room=eq.${encodeURIComponent(room)}&order=created_at.asc`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );

      const data = await r.json();
      return res.status(r.status).json(data);

    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  if (req.method === "POST") {
    try {
      const { room, sender, message, image_url, reply_to = null, reply_preview = null } = req.body;

      if (!room || !sender || (!message && !image_url)) {
        return res.status(400).json({ success: false, error: "Missing fields" });
      }

      const body = {
        room,
        sender,
        message: message || "🖼 Imagem",
      };

      if (image_url) body.image_url = image_url;
      if (reply_to !== undefined) body.reply_to = reply_to;
      if (reply_preview !== undefined) body.reply_preview = reply_preview;

      const r = await fetch(endpoint, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(body),
      });

      if (!r.ok) {
        const t = await r.text();
        return res.status(500).json({ success: false, error: t });
      }

      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}
