import { createClient } from "@supabase/supabase-js";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false, // necessário para receber FormData
  },
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // use a SERVICE ROLE KEY aqui
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: "Erro ao processar upload" });
    }

    try {
      const file = files.file;
      const fileName = fields.fileName;

      const fileData = fs.readFileSync(file.filepath);

      const { error } = await supabase.storage
        .from("chat-images") // nome do bucket
        .upload(fileName, fileData, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      const { data } = supabase.storage
        .from("chat-images")
        .getPublicUrl(fileName);

      return res.status(200).json({ url: data.publicUrl });

    } catch (e) {
      return res.status(500).json({ error: "Erro no upload" });
    }
  });
}