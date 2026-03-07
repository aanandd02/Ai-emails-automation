import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const { GMAIL_USER, GMAIL_APP_PASS } = process.env;

if (!GMAIL_USER || !GMAIL_APP_PASS) {
  throw new Error("Missing required env vars: GMAIL_USER and/or GMAIL_APP_PASS");
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASS,
  },
});

export default transporter;
