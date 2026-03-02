import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false });
  }

  const { channel_id, sender, message } = req.body;

  if (!channel_id || !sender) {
    return res.status(400).json({
      success: false,
      error: "channel_id e sender são obrigatórios"
    });
  }

  // 🔹 Só insere mensagem se ela existir
  if (message && message.trim() !== "") {
    const { error } = await supabase
      .from("private_messages")
      .insert({
        channel_id,
        sender,
        message
      });

    if (error) {
      return res.status(500).json({ success: false });
    }
  }

  // 🔹 Atualiza atividade do canal (sempre)
  await supabase
    .from("private_channels")
    .update({ last_activity: new Date().toISOString() })
    .eq("id", channel_id);

  res.json({ success: true });
}
