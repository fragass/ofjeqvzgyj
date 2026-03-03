export default async function handler(req, res) {
  const { channel_id } = req.query;

  if (!channel_id) {
    return res.status(400).json({ error: "Missing channel_id" });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: "Supabase not configured" });
  }

  try {
    const headers = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    };

    // 🔥 1️⃣ LIMPEZA AUTOMÁTICA (24h)
    const expirationDate = new Date(Date.now() - 86400000).toISOString();

    await fetch(
      `${SUPABASE_URL}/rest/v1/private_channels?last_activity=lt.${expirationDate}`,
      {
        method: "DELETE",
        headers,
      }
    );
    // Se existir foreign key com ON DELETE CASCADE,
    // as mensagens do canal serão apagadas automaticamente.

    // 🔍 2️⃣ Verifica se o canal ainda existe (pode ter sido deletado acima)
    const checkChannel = await fetch(
      `${SUPABASE_URL}/rest/v1/private_channels?id=eq.${channel_id}`,
      { headers }
    );

    const channelData = await checkChannel.json();

    if (!channelData.length) {
      return res.status(404).json({ error: "Channel expired or not found" });
    }

    // 💬 3️⃣ Busca mensagens normalmente
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/private_messages?channel_id=eq.${channel_id}&order=created_at.asc`,
      { headers }
    );

    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
