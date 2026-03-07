const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function isAdminUser(username) {
  const { data, error } = await supabase
    .from("users")
    .select("is_admin")
    .eq("username", username)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return !!data?.is_admin;
}

module.exports = async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      success:false,
      message:"Método não permitido"
    });
  }

  try {

    const { adminUsername, newUsername, newPassword } = req.body || {};

    if (!adminUsername || !newUsername || !newPassword) {
      return res.status(400).json({
        success:false,
        message:"Dados obrigatórios ausentes"
      });
    }

    const isAdmin = await isAdminUser(adminUsername);

    if (!isAdmin) {
      return res.status(403).json({
        success:false,
        message:"Apenas administradores podem criar usuários"
      });
    }

    const username = newUsername.trim().toLowerCase();
    const password = newPassword.trim();

    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
      return res.status(400).json({
        success:false,
        message:"Username inválido (3-24 caracteres, letras ou números)"
      });
    }

    if (password.length < 4) {
      return res.status(400).json({
        success:false,
        message:"Senha precisa ter pelo menos 4 caracteres"
      });
    }

    const { data:existing } = await supabase
      .from("users")
      .select("id")
      .eq("username",username)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({
        success:false,
        message:"Esse usuário já existe"
      });
    }

    const hash = await bcrypt.hash(password,10);

    const { error } = await supabase
      .from("users")
      .insert({
        username,
        password:hash,
        is_admin:false
      });

    if (error) throw new Error(error.message);

    return res.status(200).json({
      success:true,
      message:`Usuário @${username} criado com sucesso`
    });

  } catch(e) {

    return res.status(500).json({
      success:false,
      message:e.message || "Erro interno ao criar usuário"
    });

  }
};