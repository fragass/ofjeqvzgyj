import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json([]);
  }

  const { channel_id } = req.query;
  if (!channel_id) {
    return res.status(400).json([]);
  }

  const { data, error } = await supabase
    .from("private_messages")
    .select("*")
    .eq("channel_id", channel_id)
    .order("created_at", { ascending: true });

  if (error) {
    return res.status(500).json([]);
  }

  res.status(200).json(data || []);
}
