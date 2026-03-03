export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { user1, user2 } = req.body;

  if (!user1 || !user2 || user1 === user2) {
    return res.status(400).json({ error: "Invalid users" });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  const endpoint = `${SUPABASE_URL}/rest/v1/private_channels`;

  try {
    // Verifica se já existe
    const check = await fetch(
      `${endpoint}?or=(and(user1.eq.${user1},user2.eq.${user2}),and(user1.eq.${user2},user2.eq.${user1}))`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    const existing = await check.json();

    if (existing.length) {
      return res.status(200).json({ channel: existing[0] });
    }

    // Cria novo
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        user1,
        user2,
        last_activity: new Date().toISOString(),
      }),
    });

    const data = await response.json();
    return res.status(200).json({ channel: data[0] });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}