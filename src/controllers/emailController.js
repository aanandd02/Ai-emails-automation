// src/controllers/emailController.js
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

import { generateEmail, generateUniqueSubject } from "../services/aiService.js";
import { sendEmailSafely } from "../services/mailService.js";
import {
  readGoogleSheetData,
  updateStatusInGoogleSheet,
} from "../services/googleSheetService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../");

// Single source of truth
const SENT_EMAILS_FILE = path.join(projectRoot, "data", "sentEmails.json");

function loadSentEmails() {
  try {
    if (!fs.existsSync(SENT_EMAILS_FILE)) {
      fs.mkdirSync(path.dirname(SENT_EMAILS_FILE), { recursive: true });
      fs.writeFileSync(SENT_EMAILS_FILE, "[]", "utf8");
      console.log("✨ Created sentEmails.json");
      return [];
    }
    const data = JSON.parse(fs.readFileSync(SENT_EMAILS_FILE, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("⚠️ Error reading sentEmails.json:", err.message);
    return [];
  }
}

function saveSentEmails(emails) {
  try {
    fs.writeFileSync(SENT_EMAILS_FILE, JSON.stringify(emails, null, 2), "utf8");
  } catch (err) {
    console.error("⚠️ Error saving sentEmails.json:", err.message);
  }
}

export async function sendEmailsFromGoogleSheet() {
  try {
    const sentEmails = loadSentEmails();

    const users = await readGoogleSheetData();
    console.log(`✅ Fetched ${users.length} rows from Google Sheet`);

    const validUsers = users
      .map((u, index) => ({
        ...u,
        rowNumber: index + 2,
      }))
      .filter((u) => u.name && u.email);

    console.log(`📊 Valid users ready: ${validUsers.length}`);

    for (let i = 0; i < validUsers.length; i++) {
      const { name, email, status, rowNumber } = validUsers[i];

      if (status?.toLowerCase() === "sent" || sentEmails.includes(email)) {
        continue;
      }

      console.log(`📨 (${i + 1}/${validUsers.length}) Preparing email for ${email}...`);

      try {
        const subject = await generateUniqueSubject(name);
        const emailBody = await generateEmail(name);

        await sendEmailSafely(email, subject, emailBody);

        await updateStatusInGoogleSheet(rowNumber, "Sent");
        console.log(`✅ Marked ${email} as Sent (Row ${rowNumber})`);

        sentEmails.push(email);
        saveSentEmails(sentEmails);
      } catch (err) {
        console.error(`❌ Failed for ${email}: ${err.message}`);
        await updateStatusInGoogleSheet(rowNumber, "Failed");
      }
    }

    console.log("🎉 All emails processed successfully!");
  } catch (err) {
    console.error("❌ Error in workflow:", err.message);
  }
}
