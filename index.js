// main.js
import dotenv from "dotenv";
import { sendEmailsFromGoogleSheet } from "./src/controllers/emailController.js";

dotenv.config();

async function main() {
  try {
    console.log("📬 Starting email automation...");
    await sendEmailsFromGoogleSheet();
  } catch (error) {
    console.error("❌ Error in sending emails:", error.message);
  }
}

main();
