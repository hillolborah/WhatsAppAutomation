import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// === Resolve current directory relative to project root ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../../../');

// === Log file path ===
const sessionLogPath = path.join(projectRoot, 'whatsapp-bot', 'logs', 'session_pairs.jsonl');

// === In-memory store for session messages ===
const sessionData = {};

/**
 * Logs a message to the in-memory session store, grouping by session ID (sender JID)
 * @param {string} sender - WhatsApp JID
 * @param {string} message - Message content
 * @param {boolean} isBot - Whether this message is from bot
 */
export function logSessionMessage(sender, message, isBot) {
  if (!sessionData[sender]) {
    sessionData[sender] = {
      prompt: [],
      response: []
    };
  }

  if (isBot) {
    sessionData[sender].response.push(message);
  } else {
    sessionData[sender].prompt.push(message);
  }
}

/**
 * Flushes in-memory session data to JSONL log file and clears the memory store.
 */
export function flushSession() {
  if (!fs.existsSync(sessionLogPath)) {
    fs.writeFileSync(sessionLogPath, ''); // create file if not exists
  }

  for (const sender in sessionData) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'session',
      between: sender,
      prompt: sessionData[sender].prompt.join(' | '),
      response: sessionData[sender].response.join(' | ')
    };

    fs.appendFileSync(sessionLogPath, JSON.stringify(logEntry) + '\n');
  }

  // Clear in-memory data after flushing
  for (const sender in sessionData) {
    delete sessionData[sender];
  }

  console.log('✅ Session log flushed.');
}
