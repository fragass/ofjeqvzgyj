const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { loggedUser } = req.body;

  if (!loggedUser) {
    return res.status(400).json({ isAdmin: false });
  }

  const { data, error } = await supabase
    .from("special_users")
    .select("id")
    .eq("logged_user", loggedUser)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Erro ao verificar admin:", error);
    return res.status(500).json({ isAdmin: false });
  }

  return res.status(200).json({
    isAdmin: !!data
  });
};