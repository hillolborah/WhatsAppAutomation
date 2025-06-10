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
import path from 'path';

import { logBotInteraction, logUserInteraction } from './logger/messageLogger.js';

dotenv.config({ path: path.resolve('../.env') });

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
    if (!message.message || message.key.fromMe) return;

    const text = message.message.conversation;
    const sender = message.key.remoteJid;

    if (!text) return;

    console.log(`📩 Message from ${sender}: ${text}`);

    const isModelEnabled = process.env.ENABLE_MODEL_RESPONSE === 'true';

    if (isModelEnabled) {
      const reply = await handleModelResponse(text);
      await sendMessage(sock, sender, reply);
      console.log(`📤 Replied to ${sender}: ${reply}`);
      logBotInteraction(text, reply, sender);
    } else {
      logUserInteraction(sender, text);
    }
  });
}

startBot();




// import qrcode from 'qrcode-terminal';
// import baileys from '@whiskeysockets/baileys';
// const {
//   makeWASocket,
//   useMultiFileAuthState,
//   DisconnectReason,
//   fetchLatestBaileysVersion
// } = baileys;

// const { Boom } = await import('@hapi/boom');
// import fetch from 'node-fetch';
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve('../.env') });

// import { logMessage } from './logger/messageLogger.js';  // 👈 you were missing this line

// // === Model Inference Handler ===
// async function handleModelResponse(prompt) {
//   try {
//     const res = await fetch("http://localhost:11434/api/generate", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         model: process.env.MODEL_NAME || "phi4",
//         prompt: prompt,
//         stream: false
//       })
//     });
//     const data = await res.json();
//     return data.response;
//   } catch (err) {
//     console.error("❌ Error calling Ollama:", err);
//     return "Sorry, I had a problem generating a reply!";
//   }
// }

// // === Response Sender ===
// async function sendMessage(sock, to, message) {
//   await sock.sendMessage(to, { text: message });
// }

// // === Start WhatsApp Connection ===
// async function startBot() {
//   const { state, saveCreds } = await useMultiFileAuthState('./auth');
//   const { version } = await fetchLatestBaileysVersion();

//   const sock = makeWASocket({
//     version,
//     auth: state,
//     printQRInTerminal: true
//   });

//   sock.ev.on('creds.update', saveCreds);

//   sock.ev.on("connection.update", (update) => {
//     const { connection, lastDisconnect, qr } = update;

//     if (qr) {
//       console.log("📱 Scan this QR code to log in:");
//       qrcode.generate(qr, { small: true });
//     }

//     if (connection === 'close') {
//       const shouldReconnect =
//         lastDisconnect?.error instanceof Boom
//           ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
//           : true;
//       console.log("connection closed due to", lastDisconnect?.error, ", reconnecting:", shouldReconnect);
//       if (shouldReconnect) startBot();
//     } else if (connection === 'open') {
//       console.log("✅ WhatsApp bot connected!");
//     }
//   });

//   // === Message Listener ===
//   sock.ev.on("messages.upsert", async ({ messages }) => {
//     const message = messages[0];
//     if (!message.message || message.key.fromMe) return;

//     const text = message.message.conversation;
//     const sender = message.key.remoteJid;

//     console.log(`📩 Received message from ${sender}: ${text}`);

//     let reply = "";

//     if (process.env.ENABLE_MODEL_RESPONSE === 'true') {
//       reply = await handleModelResponse(text);
//       await sendMessage(sock, sender, reply);
//       console.log(`📤 Replied to ${sender}: ${reply}`);
//     }

//     logMessage(text, reply, sender);
//   });
// }

// startBot();
