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

  try {
    const { requester, username } = req.body || {};

    if (!requester || !username) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos"
      });
    }

    const normalizedRequester = String(requester).trim();
    const normalizedUsername = String(username).trim().replace(/^@+/, "");

    if (!normalizedUsername) {
      return res.status(400).json({
        success: false,
        message: "Usuário inválido"
      });
    }

    const { data: adminUser, error: adminError } = await supabase
      .from("users")
      .select("username, is_admin")
      .eq("username", normalizedRequester)
      .single();

    if (adminError || !adminUser) {
      return res.status(403).json({
        success: false,
        message: "Admin não validado"
      });
    }

    if (!adminUser.is_admin) {
      return res.status(403).json({
        success: false,
        message: "Apenas admins podem remover usuários"
      });
    }

    if (normalizedUsername === normalizedRequester) {
      return res.status(400).json({
        success: false,
        message: "Você não pode remover sua própria conta por esse comando"
      });
    }

    const { data: targetUser, error: targetFindError } = await supabase
      .from("users")
      .select("username, is_admin")
      .eq("username", normalizedUsername)
      .single();

    if (targetFindError || !targetUser) {
      return res.status(404).json({
        success: false,
        message: `Usuário @${normalizedUsername} não encontrado`
      });
    }

    if (targetUser.is_admin) {
      return res.status(403).json({
        success: false,
        message: "Não é permitido remover outro admin por esse comando"
      });
    }

    const { error: deleteError } = await supabase
      .from("users")
      .delete()
      .eq("username", normalizedUsername);

    if (deleteError) {
      return res.status(500).json({
        success: false,
        message: deleteError.message || "Erro ao remover usuário"
      });
    }

    return res.status(200).json({
      success: true,
      message: `Usuário @${normalizedUsername} removido com sucesso`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Erro interno ao remover usuário"
    });
  }
}