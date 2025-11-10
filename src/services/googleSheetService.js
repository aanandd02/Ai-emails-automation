// src/services/googleSheetService.js
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const credentialsPath = path.resolve(__dirname, "../config/google-credentials.json");

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const GOOGLE_SHEET_ID = "1AWwp1NaHVOICUvzDgGHWo2EiWYq_SovyX_x6XRW5PLA";
const SHEET_NAME = "Sheet1";

const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf-8"));
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: SCOPES,
});
const sheets = google.sheets({ version: "v4", auth });

/**
 * 🧾 Read data from Google Sheet (name, email, status)
 */
export async function readGoogleSheetData() {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: `${SHEET_NAME}!A:C`,
  });

  const rows = response.data.values || [];
  const [headers, ...data] = rows;

  return data.map((row) => ({
    name: row[0],
    email: row[1],
    status: row[2] || "",
  }));
}

/**
 * ✏️ Update status in Google Sheet (same row)
 */
export async function updateStatusInGoogleSheet(rowIndex, status) {
  const range = `${SHEET_NAME}!C${rowIndex}`; // ✅ Correct — same row, column C
  await sheets.spreadsheets.values.update({
    spreadsheetId: GOOGLE_SHEET_ID,
    range,
    valueInputOption: "RAW",
    requestBody: {
      values: [[status]],
    },
  });
  console.log(`📝 Sheet updated → Row ${rowIndex}, Status: ${status}`);
}
