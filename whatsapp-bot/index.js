import qrcode from 'qrcode-terminal';
import baileys from '@whiskeysockets/baileys';
const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = baileys;

const { Boom } = await import('@hapi/boom');
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

// === Model Inference Handler ===
async function handleModelResponse(prompt) {
  try {
    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.MODEL_NAME || "phi4",
        prompt: prompt,
        stream: false
      })
    });
    const data = await res.json();
    return data.response;
  } catch (err) {
    console.error("❌ Error calling Ollama:", err);
    return "Sorry, I had a problem generating a reply!";
  }
}

// === Response Sender ===
async function sendMessage(sock, to, message) {
  await sock.sendMessage(to, { text: message });
}

// === Start WhatsApp Connection ===
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on("connection.update", (update) => {
  const { connection, lastDisconnect, qr } = update;

  // ✅ Show QR code if provided
  if (qr) {
    console.log("📱 Scan this QR code to log in:");
    qrcode.generate(qr, { small: true });
  }

  if (connection === 'close') {
    const shouldReconnect =
      lastDisconnect?.error instanceof Boom
        ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
        : true;
    console.log("connection closed due to", lastDisconnect?.error, ", reconnecting:", shouldReconnect);
    if (shouldReconnect) startBot();
  } else if (connection === 'open') {
    console.log("✅ WhatsApp bot connected!");
  }
});


  // === Message Listener ===
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const message = messages[0];
    if (!message.message) return;

    const text = message.message.conversation;
    const sender = message.key.remoteJid;

    console.log(`📩 Received message from ${sender}: ${text}`);

    const reply = await handleModelResponse(text);
    await sendMessage(sock, sender, reply);

    console.log(`📤 Replied to ${sender}: ${reply}`);
  });
}

startBot();
