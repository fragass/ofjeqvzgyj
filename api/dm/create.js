export default async function handler(req, res) {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ success: false, error: "Supabase not configured" });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    const body = req.body || {};

    // compat com diferentes fronts/handlers
    const creator = body.creator || body.name || body.user1;
    const target = body.target || body.to || body.user2;
    const room = body.room;

    if (!creator || !target || !room) {
      return res.status(400).json({
        success: false,
        error: "Missing fields",
        details: { creator, target, room }
      });
    }

    if (!/^[A-Za-z0-9_-]{3,32}$/.test(room)) {
      return res.status(400).json({ success: false, error: "Invalid room name" });
    }

    const channelsEndpoint = `${SUPABASE_URL}/rest/v1/private_channels`;

    // (opcional) checa duplicado
    const existsResp = await fetch(
      `${channelsEndpoint}?select=id,room&room=eq.${encodeURIComponent(room)}`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    const exists = await existsResp.json();
    if (Array.isArray(exists) && exists.length) {
      return res.status(409).json({ success: false, error: "Room already exists" });
    }

    // cria o canal
    const insertResp = await fetch(channelsEndpoint, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        room,
        user1: creator,
        user2: target,
        last_activity: new Date().toISOString(),
      }),
    });

    // ✅ aqui está o segredo: retornar o erro real
    const insertText = await insertResp.text();

    if (!insertResp.ok) {
      return res.status(500).json({
        success: false,
        error: "Failed to create channel",
        details: insertText
      });
    }

    // notifica via sussurro do "Sistema" (sem quebrar o create se falhar)
    try {
      const messagesEndpoint = `${SUPABASE_URL}/rest/v1/messages`;
      await fetch(messagesEndpoint, {
        method: "POST",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          name: "Sistema",
          to: target,
          content: `@${creator} criou a sala "${room}". Use /entrar ${room}`,
        }),
      });
    } catch {}

    let created = null;
    try { created = JSON.parse(insertText); } catch {}

    return res.status(200).json({ success: true, room, created });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: "Internal error",
      details: String(e?.message || e)
    });
  }
}
