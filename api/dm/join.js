import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false });
  }

  const { from, to } = req.body;

  if (!from || !to) {
    return res.status(400).json({ success: false });
  }

  /* 🔍 procura canal existente entre os dois */
  const { data: channel, error } = await supabase
    .from("private_channels")
    .select("*")
    .or(
      `and(user_a.eq.${from},user_b.eq.${to}),and(user_a.eq.${to},user_b.eq.${from})`
    )
    .single();

  if (error || !channel) {
    return res.status(404).json({ success: false });
  }

  /* 🔄 atualiza atividade */
  await supabase
    .from("private_channels")
    .update({ last_activity: new Date() })
    .eq("id", channel.id);

  return res.status(200).json({
    success: true,
    channel
  });
}