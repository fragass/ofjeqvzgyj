import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ isAdmin: false });
  }

  const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
  );

  const loggedUser = req.query.user;

  if (!loggedUser) {
    return res.status(200).json({ isAdmin: false });
  }

  const { data, error } = await supabase
    .from("special_users")
    .select("id")
    .eq("logged_user", loggedUser)
    .limit(1)
    .single();

  if (error || !data) {
    return res.status(200).json({ isAdmin: false });
  }

  return res.status(200).json({ isAdmin: true });
}
