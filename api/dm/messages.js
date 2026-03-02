import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const { channel_id } = req.query;

  const { data } = await supabase
    .from("private_messages")
    .select("*")
    .eq("channel_id", channel_id)
    .order("created_at", { ascending: true });

  res.json(data || []);
}