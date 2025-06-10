import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve('../.env') });

const logFilePath = process.env.LOG_FILE_PATH || './logs/chatlog.jsonl';

/**
 * Logs a prompt-response pair to a JSONL file.
 * @param {string} prompt - User's message
 * @param {string} response - Your response (could be model-generated or human-written)
 * @param {string} sender - WhatsApp JID
 */
export function logMessage(prompt, response, sender) {
  if (process.env.ENABLE_LOGGING !== 'true') return;

  const logEntry = {
    timestamp: new Date().toISOString(),
    sender: sender,
    prompt: prompt,
    response: response
  };

  fs.appendFile(logFilePath, JSON.stringify(logEntry) + '\n', (err) => {
    if (err) console.error('❌ Failed to log message:', err);
  });
}
