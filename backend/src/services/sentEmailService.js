import fs from "fs/promises";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../");

const SENT_EMAILS_FILE = path.join(projectRoot, "data", "sentEmails.json");
const normalize = (email) => email.trim().toLowerCase();

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

export async function saveSentEmail(email) {
  const normalizedEmail = normalize(email);
  const sent = await loadSentEmails();
  if (!sent.includes(normalizedEmail)) {
    sent.push(normalizedEmail);
    await fs.writeFile(SENT_EMAILS_FILE, JSON.stringify(sent, null, 2), "utf-8");
  }
}

export async function isEmailAlreadySent(email) {
  const normalizedEmail = normalize(email);
  const sent = await loadSentEmails();
  return sent.includes(normalizedEmail);
}
