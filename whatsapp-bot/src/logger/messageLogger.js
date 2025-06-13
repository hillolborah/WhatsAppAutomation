import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.resolve('../../.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root: /home/yourname/WhatsAppAutomation/whatsapp-bot/
const projectRoot = path.join(__dirname, '../../');

// Logs directory: /home/yourname/WhatsAppAutomation/whatsapp-bot/logs/
const logsDir = path.join(projectRoot, 'logs');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const botLogPath = path.join(logsDir, 'bot_pairs.jsonl');
const userLogPath = path.join(logsDir, 'user_pairs.jsonl');

const enableLogging = process.env.ENABLE_LOGGING === 'true';

// NEW: store an array of messages per sender
const pendingMessages = new Map();

function writeLog(filePath, entry) {
  if (!enableLogging) return;
  fs.appendFileSync(filePath, JSON.stringify(entry) + "\n");
}

// Log bot reply
export function logBotInteraction(userMessage, botReply, sender) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: "user-bot",
    prompt: userMessage,
    response: botReply,
    from: sender
  };

  console.log("🤖 Bot Log:", JSON.stringify(logEntry, null, 2));
  writeLog(botLogPath, logEntry);

  // Optional: clear sender’s pending messages when bot replies
  pendingMessages.delete(sender);
}

// Log user message, buffer until a response
export function logUserInteraction(sender, text) {
  if (!pendingMessages.has(sender)) {
    pendingMessages.set(sender, []);
  }

  const messages = pendingMessages.get(sender);
  messages.push(text);

  // If there are 2 or more messages — treat the last as a reply to the first
  if (messages.length >= 2) {
    const prompt = messages.shift();  // remove first message
    const response = messages[0];     // next message

    const logEntry = {
      timestamp: new Date().toISOString(),
      type: "user-user",
      prompt: prompt,
      response: response,
      between: sender
    };

    console.log("👥 User-User Log:", JSON.stringify(logEntry, null, 2));
    writeLog(userLogPath, logEntry);
  }
}
