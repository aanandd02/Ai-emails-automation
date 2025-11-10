import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

console.log("📧 GMAIL_USER:", process.env.GMAIL_USER || "❌ missing");
console.log("🔐 GMAIL_APP_PASS:", process.env.GMAIL_APP_PASS ? "✅ found" : "❌ missing");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASS,
  },
});

export default transporter;
