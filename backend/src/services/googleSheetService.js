import { google } from "googleapis";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import logger from "../utils/logger.js";

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

let credentials;
// Priority 1: Environment Variable (as JSON string)
if (process.env.GOOGLE_CREDENTIALS) {
  try {
    credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    logger.info("✅ Using Google credentials from environment variable");
  } catch (err) {
    logger.error("❌ Failed to parse GOOGLE_CREDENTIALS environment variable as JSON");
  }
}

// Priority 2: Local File
if (!credentials) {
  if (fs.existsSync(credentialsPath)) {
    try {
      credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf-8"));
      logger.info("✅ Using Google credentials from local file");
    } catch (err) {
      logger.error(`❌ Failed to parse local credentials file at: ${credentialsPath}`);
    }
  }
}

if (!credentials) {
  throw new Error(`Google credentials not found. Please provide GOOGLE_CREDENTIALS env var or place the file at: ${credentialsPath}`);
}

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
  logger.info(`📝 Sheet updated → Row ${rowIndex}, Status: ${status}`);
}
