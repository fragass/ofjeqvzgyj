const loggedUser = sessionStorage.getItem("loggedUser");
const currentUserIsAdmin = sessionStorage.getItem("isAdmin") === "true";

let lastMessageId = null;
let pendingImageUrl = null;

let chatMode = "public";
let currentRoom = null;
let currentOther = null;

let replyState = null;
let lastRenderedElements = [];

let supabaseClient = null;
let publicChannel = null;
let dmChannel = null;

const API_BASE = "/api/[...route]";

function buildApiUrl(route, query = {}) {
  const cleanRoute = String(route || "").replace(/^\/+|\/+$/g, "");
  const params = new URLSearchParams();
  params.set("route", cleanRoute);

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  });

  return `${API_BASE}?${params.toString()}`;
}

function apiFetch(route, options = {}, query = {}) {
  return fetch(buildApiUrl(route, query), options);
}

async function setupRealtime() {

  const res = await apiFetch("realtime/config");
  const cfg = await res.json();

  supabaseClient = window.supabase.createClient(cfg.url, cfg.anonKey);

  publicChannel = supabaseClient.channel("room:public");

  publicChannel
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "messages" },
      async () => {
        if (chatMode === "public") {
          await loadPublicMessages({ forceScrollBottom: true });
        }
      }
    )
    .subscribe();

}

async function setupDmChannel() {

  if (!currentRoom) return;

  if (dmChannel) {
    await supabaseClient.removeChannel(dmChannel);
  }

  dmChannel = supabaseClient.channel(`room:dm:${currentRoom}`);

  dmChannel
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "private_messages" },
      async () => {
        if (chatMode === "dm") {
          await loadDmMessages({ forceScrollBottom: true });
        }
      }
    )
    .subscribe();
}

function escapeHTML(str) {
  return String(str || "").replace(/[&<>"']/g, m => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    "\"":"&quot;",
    "'":"&#039;"
  }[m]));
}

function highlightMentions(text) {
  const escaped = escapeHTML(text);
  return escaped.replace(/@(\w+)/g, (match, username) => {
    if (username === loggedUser) {
      return `<span class="mention-self">@${username}</span>`;
    }
    return `<span class="mention">@${username}</span>`;
  });
}

async function loadPublicMessages(options = {}) {

  const res = await apiFetch("messages");
  const data = await res.json();

  const box = document.getElementById("messages");
  box.innerHTML = "";

  data.forEach(msg => {

    const div = document.createElement("div");
    div.className = "message";

    const date = new Date(msg.created_at).toLocaleString("pt-BR");

    const contentHTML = highlightMentions(msg.content);

    div.innerHTML = `
      <div class="message-header">
        <span class="username">${escapeHTML(msg.name)}</span>
        <span class="timestamp">${date}</span>
      </div>
      <div>${contentHTML}</div>
    `;

    box.appendChild(div);

  });

  if (options.forceScrollBottom) {
    box.scrollTop = box.scrollHeight;
  }

}

async function loadDmMessages(options = {}) {

  const res = await apiFetch("dm/messages", {}, {
    room: currentRoom,
    name: loggedUser
  });

  const data = await res.json();

  const box = document.getElementById("messages");
  box.innerHTML = "";

  data.forEach(msg => {

    const div = document.createElement("div");
    div.className = "message dm";

    const date = new Date(msg.created_at).toLocaleString("pt-BR");

    div.innerHTML = `
      <div class="message-header">
        <span class="username">${escapeHTML(msg.sender)}</span>
        <span class="timestamp">${date}</span>
      </div>
      <div>${highlightMentions(msg.message)}</div>
    `;

    box.appendChild(div);

  });

  if (options.forceScrollBottom) {
    box.scrollTop = box.scrollHeight;
  }

}

async function sendPublicMessage(text) {

  await apiFetch("messages", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({
      name: loggedUser,
      content: text
    })
  });

}

async function sendDmMessage(text) {

  await apiFetch("dm/messages", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({
      room: currentRoom,
      sender: loggedUser,
      message: text
    })
  });

}

async function sendMessage() {

  const input = document.getElementById("content");
  const text = input.value.trim();

  if (!text) return;

  input.value = "";

  if (chatMode === "dm") {
    await sendDmMessage(text);
  } else {
    await sendPublicMessage(text);
  }

}

document.addEventListener("DOMContentLoaded", async () => {

  await setupRealtime();

  await loadPublicMessages({ forceScrollBottom: true });

  const contentInput = document.getElementById("content");

  contentInput.addEventListener("keydown", e => {

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }

  });

});
