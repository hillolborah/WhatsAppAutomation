import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

// === Resolve current directory relative to project root ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../../../');

// === Log file path ===
const sessionLogPath = path.join(projectRoot, 'whatsapp-bot', 'logs', 'session_pairs.jsonl');

// === Rotation size limit from .env (default 5KB if not set) ===
const rotationSize = parseInt(process.env.LOG_ROTATION_SIZE || 5120); // in bytes

// === In-memory store for session messages ===
const sessionData = {};

/**
 * Check log file size and rotate if it exceeds the configured limit.
 */
function rotateLogIfNeeded() {
  if (fs.existsSync(sessionLogPath)) {
    const stats = fs.statSync(sessionLogPath);
    if (stats.size >= rotationSize) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedFile = sessionLogPath.replace('.jsonl', `-${timestamp}.jsonl`);
      fs.renameSync(sessionLogPath, rotatedFile);
      console.log(`🌀 Rotated log file to ${rotatedFile}`);
    }
  }
}

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

  rotateLogIfNeeded();  // check for log rotation each time a message is logged
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
