// src/services/sentEmailService.js
import fs from "fs/promises";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

// Get project root → always consistent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../");

// ✅ Always use single correct path
const SENT_EMAILS_FILE = path.join(projectRoot, "data", "sentEmails.json");

/**
 * 📥 Load all previously sent emails from JSON file (async)
 */
export async function loadSentEmails() {
  try {
    await fs.access(SENT_EMAILS_FILE);
    const data = await fs.readFile(SENT_EMAILS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    await fs.mkdir(path.dirname(SENT_EMAILS_FILE), { recursive: true });
    await fs.writeFile(SENT_EMAILS_FILE, "[]", "utf-8");
    return [];
  }
}

/**
 * 💾 Save a new email address to the sent list
 */
export async function saveSentEmail(email) {
  const sent = await loadSentEmails();
  if (!sent.includes(email)) {
    sent.push(email);
    await fs.writeFile(SENT_EMAILS_FILE, JSON.stringify(sent, null, 2), "utf-8");
  }
}

/**
 * 🔍 Check if an email has already been sent
 */
export async function isEmailAlreadySent(email) {
  const sent = await loadSentEmails();
  return sent.includes(email);
}
