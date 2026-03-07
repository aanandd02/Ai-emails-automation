import { google } from "googleapis";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const credentialsPath = path.resolve(__dirname, "../config/google-credentials.json");

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || "Sheet1";

if (!GOOGLE_SHEET_ID) {
  throw new Error("Missing required env var: GOOGLE_SHEET_ID");
}
if (!fs.existsSync(credentialsPath)) {
  throw new Error(`Missing Google credentials file at: ${credentialsPath}`);
}

const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf-8"));
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: SCOPES,
});
const sheets = google.sheets({ version: "v4", auth });

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

export async function updateStatusInGoogleSheet(rowIndex, status) {
  const range = `${SHEET_NAME}!C${rowIndex}`;
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
