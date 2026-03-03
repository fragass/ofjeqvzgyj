export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { channel_id, sender, message } = req.body;

  if (!channel_id || !sender || !message) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  try {
    // Atualiza last_activity
    await fetch(`${SUPABASE_URL}/rest/v1/private_channels?id=eq.${channel_id}`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        last_activity: new Date().toISOString(),
      }),
    });

    // Insere mensagem
    await fetch(`${SUPABASE_URL}/rest/v1/private_messages`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        channel_id,
        sender,
        message,
      }),
    });

    return res.status(200).json({ success: true });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}