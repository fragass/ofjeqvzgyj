export default async function handler(req, res) {
  const { channel_id } = req.query;

  if (!channel_id) {
    return res.status(400).json({ error: "Missing channel_id" });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/private_messages?channel_id=eq.${channel_id}&order=created_at.asc`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}