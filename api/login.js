import crypto from "crypto";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Método não permitido" });
  }

  const { username, password } = req.body;

  const usersEnv = process.env.LOGIN_USERS || "";
  const usersArray = usersEnv.split(",");

  const usersMap = {};
  usersArray.forEach(pair => {
    const [user, pass] = pair.split(":");
    if (user && pass) usersMap[user] = pass;
  });

  if (usersMap[username] && usersMap[username] === password) {
    const token = crypto.randomBytes(32).toString("hex");

    return res.status(200).json({
      success: true,
      token,
      user: username
    });
  }

  return res.status(401).json({ success: false });
}
import crypto from "crypto";

async function getUserGroup(username, supabaseUrl, supabaseAnonKey) {
  const baseHeaders = {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
    "Content-Type": "application/json",
  };

  const specialResponse = await fetch(
    `${supabaseUrl}/rest/v1/special_users?select=logged_user&logged_user=eq.${encodeURIComponent(username)}&limit=1`,
    { headers: baseHeaders }
  );

  if (specialResponse.ok) {
    const specialData = await specialResponse.json();
    if (Array.isArray(specialData) && specialData.length > 0) {
      return "special";
    }
  }

  const normalResponse = await fetch(
    `${supabaseUrl}/rest/v1/normal_users?select=logged_user&logged_user=eq.${encodeURIComponent(username)}&limit=1`,
    { headers: baseHeaders }
  );

  if (normalResponse.ok) {
    const normalData = await normalResponse.json();
    if (Array.isArray(normalData) && normalData.length > 0) {
      return "normal";
    }
  }

  await fetch(`${supabaseUrl}/rest/v1/normal_users`, {
    method: "POST",
    headers: {
      ...baseHeaders,
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ logged_user: username }),
  });

  return "normal";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Método não permitido" });
  }

  const { username, password } = req.body;

  const usersEnv = process.env.LOGIN_USERS || "";
  const usersArray = usersEnv.split(",");

  const usersMap = {};
  usersArray.forEach((pair) => {
    const [user, pass] = pair.split(":");
    if (user && pass) usersMap[user] = pass;
  });

  if (usersMap[username] && usersMap[username] === password) {
    const token = crypto.randomBytes(32).toString("hex");
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    let group = "normal";
    if (supabaseUrl && supabaseAnonKey) {
      group = await getUserGroup(username, supabaseUrl, supabaseAnonKey);
    }

    return res.status(200).json({
      success: true,
      token,
      user: username,
      group,
    });
  }

  return res.status(401).json({ success: false });
}
