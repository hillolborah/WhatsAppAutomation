import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root and logs directory
const projectRoot = path.join(__dirname, '../../');
const logsDir = path.join(projectRoot, 'logs');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const botLogPath = path.join(logsDir, 'bot_pairs.jsonl');
const userLogPath = path.join(logsDir, 'user_pairs.jsonl');

const pendingMessages = new Map();

// Factory function returning the loggers
export function createLoggers(enableLogging) {
  function writeLog(filePath, entry) {
    if (!enableLogging) return;
    fs.appendFileSync(filePath, JSON.stringify(entry) + "\n");
  }

  function logBotInteraction(userMessage, botReply, sender) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: "user-bot",
      prompt: userMessage,
      response: botReply,
      from: sender
    };
    console.log("🤖 Bot Log:", JSON.stringify(logEntry, null, 2));
    writeLog(botLogPath, logEntry);
    pendingMessages.delete(sender);
  }

  function logUserInteraction(sender, text) {
    if (!pendingMessages.has(sender)) {
      pendingMessages.set(sender, []);
    }
    const messages = pendingMessages.get(sender);
    messages.push(text);

    if (messages.length >= 2) {
      const prompt = messages.shift();
      const response = messages[0];
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

  return { logBotInteraction, logUserInteraction };
}
