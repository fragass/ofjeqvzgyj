export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { user1, user2 } = req.body;

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  const endpoint = `${SUPABASE_URL}/rest/v1/private_channels`;

  try {
    const response = await fetch(
      `${endpoint}?or=(and(user1.eq.${user1},user2.eq.${user2}),and(user1.eq.${user2},user2.eq.${user1}))`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    const data = await response.json();

    if (!data.length) {
      return res.status(404).json({ error: "Channel not found" });
    }

    return res.status(200).json({ channel: data[0] });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}