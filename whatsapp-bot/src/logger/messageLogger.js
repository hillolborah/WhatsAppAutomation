import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve('./.env') });

const logsDir = path.resolve('./whatsapp-bot/logs');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const botLogPath = path.join(logsDir, 'bot_pairs.jsonl');
const userLogPath = path.join(logsDir, 'user_pairs.jsonl');

const enableLogging = process.env.ENABLE_LOGGING === 'true';

const pendingMessages = new Map();

function writeLog(filePath, entry) {
  if (!enableLogging) return;
  fs.appendFileSync(filePath, JSON.stringify(entry) + "\n");
}

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
}

export function logUserInteraction(sender, text) {
  if (pendingMessages.has(sender)) {
    const prompt = pendingMessages.get(sender);

    const logEntry = {
      timestamp: new Date().toISOString(),
      type: "user-user",
      prompt: prompt,
      response: text,
      between: sender
    };

    console.log("👥 User-User Log:", JSON.stringify(logEntry, null, 2));
    writeLog(userLogPath, logEntry);

    pendingMessages.delete(sender);
  } else {
    pendingMessages.set(sender, text);
  }
}
