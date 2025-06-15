import qrcode from 'qrcode-terminal';
import baileys from '@whiskeysockets/baileys';
import { pino } from 'pino';

const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = baileys;

const { Boom } = await import('@hapi/boom');
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ✅ New session logger
import { logSessionMessage, flushSession } from './logger/sessionLogger.js';

// === Resolve current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../../');

// Load .env from project root
dotenv.config({ path: path.join(projectRoot, '.env') });

// Read config values
const ENABLE_LOGGING = process.env.ENABLE_LOGGING === 'true';
const MODEL_NAME = process.env.MODEL_NAME || 'phi4';

// ====== GLOBAL ERROR HANDLERS ======
process.on('uncaughtException', (err) => {
  console.error("💥 Uncaught Exception:", err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
});

// === Model Inference Handler ===
async function handleModelResponse(prompt) {
  try {
    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL_NAME,
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
  const authDir = path.join(projectRoot, 'whatsapp-bot', 'auth');
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: 'fatal' })
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

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
    if (!text) return;

    const isModelEnabled = process.env.ENABLE_MODEL_RESPONSE === 'true';

    // Incoming user message
    if (!message.key.fromMe) {
      console.log(`📩 Message from ${sender}: ${text}`);
      logSessionMessage(sender, text, false);

      if (isModelEnabled) {
        const reply = await handleModelResponse(text);
        await sendMessage(sock, sender, reply);
        console.log(`📤 Replied to ${sender}: ${reply}`);
        logSessionMessage(sender, reply, true);
      }
    }

    // Outgoing message (typed by npc user in user-user test mode)
    if (message.key.fromMe && !isModelEnabled) {
      console.log(`📤 Outgoing (npc) message to ${sender}: ${text}`);
      logSessionMessage(sender, text, true);
    }
  });
}

startBot();

// Cleanly flush session on exit
process.on('SIGINT', () => {
  console.log('🛑 Caught interrupt signal (SIGINT). Flushing session...');
  flushSession();
  process.exit();
});
process.on('SIGTERM', () => {
  console.log('🛑 Caught termination signal (SIGTERM). Flushing session...');
  flushSession();
  process.exit();
});
