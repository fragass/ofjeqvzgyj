import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false });
  }

  const { from, to } = req.body;

  if (!from || !to) {
    return res.status(400).json({ success: false });
  }

  // ordena para evitar duplicado
  const users = [from, to].sort();

  const { data: existing } = await supabase
    .from("private_channels")
    .select("*")
    .eq("user1", users[0])
    .eq("user2", users[1])
    .single();

  if (existing) {
    return res.json({ success: true, channel: existing });
  }

  const { data, error } = await supabase
    .from("private_channels")
    .insert({
      user1: users[0],
      user2: users[1],
      last_activity: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ success: false });
  }

  return res.json({ success: true, channel: data });
}
