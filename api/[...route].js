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

/*
========================
ROUTER INTELIGENTE
========================
*/

function getRouteKey(req) {
  // 1️⃣ padrão do catch-all
  if (req.query?.route) {
    const r = req.query.route;
    if (Array.isArray(r)) return r.join("/");
    if (typeof r === "string") return r;
  }

  // 2️⃣ fallback via URL
  const url = req.url || "";
  const clean = url.split("?")[0];

  const parts = clean.split("/").filter(Boolean);

  const apiIndex = parts.indexOf("api");

  if (apiIndex !== -1) {
    return parts.slice(apiIndex + 1).join("/");
  }

  return "";
}

/*
========================
UTILS
========================
*/

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

function extractStoragePathFromPublicUrl(publicUrl, bucketName) {
  if (!publicUrl) return null;

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

/*
========================
LOGIN
========================
*/

async function handleLogin(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false });
  }

  try {
    const { username, password } = await readJsonBody(req);

    if (!username || !password) {
      return res.status(400).json({ success: false });
    }

    const { data } = await supabaseAnon
      .from("users")
      .select("username,password,is_admin")
      .eq("username", username)
      .single();

    if (!data || data.password !== password) {
      return res.status(401).json({ success: false });
    }

    const token = crypto.randomBytes(32).toString("hex");

    return res.status(200).json({
      success: true,
      token,
      user: data.username,
      isAdmin: !!data.is_admin
    });

  } catch {
    return res.status(500).json({ success: false });
  }
}

/*
========================
PROFILE UPLOAD
========================
*/

async function handleProfileUpload(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success:false });
  }

  let tempFilePath = null;

  try {
    const { fields, files } = await parseForm(req);

    let file = files.file;
    let username = fields.username;

    if (Array.isArray(file)) file = file[0];
    if (Array.isArray(username)) username = username[0];

    if (!file) {
      return res.status(400).json({ success:false, message:"Nenhum arquivo enviado" });
    }

    tempFilePath = file.filepath;

    const fileData = fs.readFileSync(tempFilePath);

    const filePath = `${username}/avatar-${Date.now()}.png`;

    const { error } = await supabaseService.storage
      .from("profile-avatars")
      .upload(filePath, fileData, {
        contentType: file.mimetype,
      });

    if (error) {
      return res.status(500).json({ success:false, message:error.message });
    }

    const { data } = supabaseService.storage
      .from("profile-avatars")
      .getPublicUrl(filePath);

    return res.status(200).json({
      success:true,
      url:data.publicUrl
    });

  } catch {
    return res.status(500).json({ success:false });

  } finally {
    if (tempFilePath) {
      try { fs.unlinkSync(tempFilePath); } catch {}
    }
  }
}

/*
========================
CHAT IMAGE UPLOAD
========================
*/

async function handleChatUpload(req,res){

  if(req.method!=="POST"){
    return res.status(405).json({error:"Method not allowed"});
  }

  let tempFilePath=null;

  try{

    const {files,fields}=await parseForm(req);

    let file=files.file;

    if(Array.isArray(file)) file=file[0];

    if(!file){
      return res.status(400).json({error:"Nenhum arquivo"});
    }

    tempFilePath=file.filepath;

    const fileName=`${Date.now()}-${file.originalFilename}`;

    const fileData=fs.readFileSync(tempFilePath);

    const {error}=await supabaseService.storage
      .from("chat-images")
      .upload(fileName,fileData,{
        contentType:file.mimetype
      });

    if(error){
      return res.status(500).json({error:error.message});
    }

    const {data}=supabaseService.storage
      .from("chat-images")
      .getPublicUrl(fileName);

    return res.status(200).json({
      url:data.publicUrl
    });

  }catch{
    return res.status(500).json({error:"Erro interno"});
  }
  finally{
    if(tempFilePath){
      try{fs.unlinkSync(tempFilePath);}catch{}
    }
  }
}

/*
========================
MAIN ROUTER
========================
*/

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
    success:false,
    message:`Rota não encontrada: ${routeKey}`
  });
};
