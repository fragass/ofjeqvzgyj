import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false });
  }

  // from = quem está entrando
  // owner = quem criou o chat
  const { from, owner } = req.body;

  if (!from || !owner) {
    return res.status(400).json({ success: false });
  }

  const users = [from, owner].sort();

  const { data: channel, error } = await supabase
    .from("private_channels")
    .select("*")
    .eq("user1", users[0])
    .eq("user2", users[1])
    .single();

  if (error || !channel) {
    return res.status(404).json({ success: false });
  }

  await supabase
    .from("private_channels")
    .update({ last_activity: new Date().toISOString() })
    .eq("id", channel.id);

  return res.status(200).json({
    success: true,
    channel
  });
}
