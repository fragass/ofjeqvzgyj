export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
  const PRIVATE_CHAT_PREFIX = "__pc__:";
  const PRIVATE_CHAT_TTL_MINUTES = Number(process.env.PRIVATE_CHAT_TTL_MINUTES || 30);

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: "Supabase not configured" });
  }

  const endpoint = `${SUPABASE_URL}/rest/v1/messages`;
  const endpoint = `${SUPABASE_URL}/rest/v1/messages`;

  function parsePrivateChatPayload(content) {
    if (typeof content !== "string" || !content.startsWith(PRIVATE_CHAT_PREFIX)) {
      return null;
    }

    const withoutPrefix = content.slice(PRIVATE_CHAT_PREFIX.length);
    const separatorIndex = withoutPrefix.indexOf(":");
    if (separatorIndex === -1) return null;

    const chatId = withoutPrefix.slice(0, separatorIndex);
    if (!chatId) return null;

    return { chatId };
  }

  async function cleanupExpiredPrivateChats(messages = []) {
    const now = Date.now();
    const ttlMs = PRIVATE_CHAT_TTL_MINUTES * 60 * 1000;
    const latestMessageByChat = new Map();

    for (const msg of messages) {
      const payload = parsePrivateChatPayload(msg.content);
      if (!payload) continue;

      const createdAtMs = new Date(msg.created_at).getTime();
      const currentLatest = latestMessageByChat.get(payload.chatId) || 0;
      if (createdAtMs > currentLatest) {
        latestMessageByChat.set(payload.chatId, createdAtMs);
      }
    }

    const staleChatIds = [...latestMessageByChat.entries()]
      .filter(([, latestMs]) => Number.isFinite(latestMs) && now - latestMs > ttlMs)
      .map(([chatId]) => chatId);

    for (const chatId of staleChatIds) {
      const query = `${endpoint}?content=like.${encodeURIComponent(`${PRIVATE_CHAT_PREFIX}${chatId}:%`)}`;

      await fetch(query, {
        method: "DELETE",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: "return=minimal",
        },
      });
    }

    return messages.filter((msg) => {
      const payload = parsePrivateChatPayload(msg.content);
      return !payload || !staleChatIds.includes(payload.chatId);
    });
  }

  if (req.method === "GET") {
    try {
      const response = await fetch(
        `${endpoint}?select=*&order=created_at.asc`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );

      const data = await response.json();
      return res.status(response.status).json(data);
      const data = await response.json();
      const cleanedData = await cleanupExpiredPrivateChats(data);
      return res.status(response.status).json(cleanedData);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "POST") {
    const { name, content, image_url, to = null } = req.body; // <-- garante 'to' mesmo null

    if (!name || !content) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const body = { name, content, to }; // <-- envia 'to' sempre, nullable
    if (image_url) body.image_url = image_url;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(body),
