const crypto = require("crypto");
const fs = require("fs");
const formidable = require("formidable");
const { createClient } = require("@supabase/supabase-js");

const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const supabaseService = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports.config = {
  api: {
    bodyParser: false,
  },
};

function getRouteParts(req) {
  const parts = req.query.route;
  if (Array.isArray(parts)) return parts;
  if (typeof parts === "string") return [parts];
  return [];
}

function getRouteKey(req) {
  return getRouteParts(req).join("/");
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";

    req.on("data", chunk => {
      data += chunk;
    });

    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });

    req.on("error", reject);
  });
}

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = new formidable.IncomingForm({ multiples: false });

    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

function escapeValue(value) {
  return String(value).replace(/"/g, '\\"');
}

function buildInFilter(values) {
  return values.map(v => `"${escapeValue(v)}"`).join(",");
}

function extractStoragePathFromPublicUrl(publicUrl, bucketName) {
  if (!publicUrl || typeof publicUrl !== "string") return null;

  try {
    const cleanUrl = publicUrl.split("?")[0];
    const marker = `/storage/v1/object/public/${bucketName}/`;
    const index = cleanUrl.indexOf(marker);
    if (index === -1) return null;
    return decodeURIComponent(cleanUrl.slice(index + marker.length));
  } catch {
    return null;
  }
}

async function handleLogin(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Método não permitido" });
  }

  try {
    const body = await readJsonBody(req);
    const { username, password } = body || {};

    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Dados incompletos" });
    }

    const { data, error } = await supabaseAnon
      .from("users")
      .select("username, password, is_admin")
      .eq("username", username)
      .single();

    if (error || !data) {
      return res.status(401).json({ success: false });
    }

    if (data.password !== password) {
      return res.status(401).json({ success: false });
    }

    const token = crypto.randomBytes(32).toString("hex");

    return res.status(200).json({
      success: true,
      token,
      user: data.username,
      isAdmin: !!data.is_admin,
    });
  } catch {
    return res.status(500).json({ success: false, message: "Erro interno" });
  }
}

async function handleProfileUpload(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Método não permitido",
    });
  }

  let tempFilePath = null;

  try {
    const { fields, files } = await parseForm(req);

    let file = files.file;
    let username = fields.username;

    if (Array.isArray(file)) file = file[0];
    if (Array.isArray(username)) username = username[0];

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Nenhum arquivo enviado",
      });
    }

    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Username obrigatório",
      });
    }

    tempFilePath = file.filepath;

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowed.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Formato inválido",
      });
    }

    const maxSize = 3 * 1024 * 1024;
    if (file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: "Imagem muito grande (máx. 3MB)",
      });
    }

    const safeUsername = String(username).trim().replace(/[^\w.-]/g, "_");

    const ext =
      file.originalFilename?.split(".").pop()?.toLowerCase() ||
      file.mimetype.split("/")[1] ||
      "png";

    const normalizedExt = ext === "jpg" ? "jpg" : ext;
    const filePath = `${safeUsername}/avatar-${Date.now()}.${normalizedExt}`;

    const { data: oldProfile, error: oldProfileError } = await supabaseService
      .from("user_profiles")
      .select("display_name, avatar_url")
      .eq("username", username)
      .maybeSingle();

    if (oldProfileError) {
      return res.status(500).json({
        success: false,
        message: oldProfileError.message,
      });
    }

    const oldAvatarUrl = oldProfile?.avatar_url || null;
    const oldStoragePath = extractStoragePathFromPublicUrl(oldAvatarUrl, "profile-avatars");
    const displayName = oldProfile?.display_name || username;

    const fileData = fs.readFileSync(file.filepath);

    const { error: uploadError } = await supabaseService.storage
      .from("profile-avatars")
      .upload(filePath, fileData, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      return res.status(500).json({
        success: false,
        message: uploadError.message,
      });
    }

    const { data: publicData } = supabaseService.storage
      .from("profile-avatars")
      .getPublicUrl(filePath);

    const avatarUrl = `${publicData.publicUrl}?v=${Date.now()}`;

    const { error: profileError } = await supabaseService
      .from("user_profiles")
      .upsert(
        {
          username,
          display_name: displayName,
          avatar_url: avatarUrl,
        },
        { onConflict: "username" }
      );

    if (profileError) {
      await supabaseService.storage.from("profile-avatars").remove([filePath]);

      return res.status(500).json({
        success: false,
        message: profileError.message,
      });
    }

    const pathsToRemove = [];

    if (oldStoragePath && oldStoragePath !== filePath) {
      pathsToRemove.push(oldStoragePath);
    }

    const legacyPaths = [
      `${safeUsername}/avatar.png`,
      `${safeUsername}/avatar.jpg`,
      `${safeUsername}/avatar.jpeg`,
      `${safeUsername}/avatar.webp`,
    ];

    legacyPaths.forEach((legacyPath) => {
      if (legacyPath !== filePath && !pathsToRemove.includes(legacyPath)) {
        pathsToRemove.push(legacyPath);
      }
    });

    if (pathsToRemove.length) {
      await supabaseService.storage.from("profile-avatars").remove(pathsToRemove);
    }

    return res.status(200).json({
      success: true,
      url: avatarUrl,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Erro interno no upload",
    });
  } finally {
    if (tempFilePath) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch {}
    }
  }
}

async function handleChatUpload(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let tempFilePath = null;

  try {
    const { fields, files } = await parseForm(req);

    let file = files.file;
    let fileName = fields.fileName;

    if (Array.isArray(file)) file = file[0];
    if (Array.isArray(fileName)) fileName = fileName[0];

    if (!file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    tempFilePath = file.filepath;

    if (!fileName) {
      fileName = `${Date.now()}-${file.originalFilename}`;
    }

    const fileData = fs.readFileSync(file.filepath);

    const { error } = await supabaseService.storage
      .from("chat-images")
      .upload(fileName, fileData, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const { data } = supabaseService.storage
      .from("chat-images")
      .getPublicUrl(fileName);

    return res.status(200).json({ url: data.publicUrl });
  } catch {
    return res.status(500).json({ error: "Erro interno no upload" });
  } finally {
    if (tempFilePath) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch {}
    }
  }
}

module.exports = async function handler(req, res) {
  const routeKey = getRouteKey(req);

  if (routeKey === "login") {
    return handleLogin(req, res);
  }

  if (routeKey === "profile-upload") {
    return handleProfileUpload(req, res);
  }

  if (routeKey === "upload") {
    return handleChatUpload(req, res);
  }

  return res.status(404).json({
    success: false,
    message: `Rota não encontrada: ${routeKey}`,
  });
};
