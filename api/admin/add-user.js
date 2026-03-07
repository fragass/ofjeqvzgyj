import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Método não permitido"
    });
  }

  const { requester, username, password } = req.body || {};

  if (!requester || !username || !password) {
    return res.status(400).json({
      success: false,
      message: "Dados inválidos"
    });
  }

  try {
    const { data: adminUser, error: adminError } = await supabase
      .from("users")
      .select("is_admin")
      .eq("username", requester)
      .maybeSingle();

    if (adminError) throw adminError;

    if (!adminUser?.is_admin) {
      return res.status(403).json({
        success: false,
        message: "Apenas admins podem usar /adduser"
      });
    }

    const cleanUsername = String(username).trim();
    const cleanPassword = String(password).trim();

    if (!/^[a-zA-Z0-9_]{3,24}$/.test(cleanUsername)) {
      return res.status(400).json({
        success: false,
        message: "Username inválido. Use 3 a 24 caracteres com letras, números ou _"
      });
    }

    if (cleanPassword.length < 4) {
      return res.status(400).json({
        success: false,
        message: "Senha muito curta"
      });
    }

    const { data: existingUser, error: existingError } = await supabase
      .from("users")
      .select("id")
      .eq("username", cleanUsername)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Esse usuário já existe"
      });
    }

    const { error: insertError } = await supabase
      .from("users")
      .insert([{ username: cleanUsername, password: cleanPassword }]);

    if (insertError) throw insertError;

    return res.status(200).json({
      success: true,
      message: `Usuário @${cleanUsername} criado com sucesso`
    });

  } catch (err) {
    console.error("Erro em /api/admin/add-user:", err);

    return res.status(500).json({
      success: false,
      message: err.message || "Erro ao criar usuário"
    });
  }
}
