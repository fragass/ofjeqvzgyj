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

  // Ordena para evitar duplicação (A+B = B+A)
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
      user2: users[1]
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ success: false });
  }

  res.json({ success: true, channel: data });
} 