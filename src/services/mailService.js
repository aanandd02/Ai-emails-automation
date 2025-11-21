// src/services/mailService.js
import transporter from "../config/mailConfig.js";
import { isEmailAlreadySent, saveSentEmail } from "./sentEmailService.js";

export async function sendEmailSafely(to, subject, htmlContent) {
  try {
    if (await isEmailAlreadySent(to)) {
      return;
    }
    const plainText = `${htmlContent.replace(/<[^>]+>/g, "")}
    
View my resume: https://drive.google.com/file/d/1dqHj0e59CKZQNcpaXIuTdIxhZNoeIa7M/view?usp=sharing`;

    await transporter.sendMail({
      from: `"Anand Shukla" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html: htmlContent,
      text: plainText,
    });
    const wait = Math.floor(Math.random() * 25000) + 20000;
    const seconds = Math.round(wait / 1000);
    console.log(
      `✅ Email sent successfully to ${to} — waiting ${seconds}s before next send...`
    );

    await saveSentEmail(to);

    await waitWithCountdown(seconds);
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
  }
}

async function waitWithCountdown(seconds) {
  for (let i = seconds; i > 0; i--) {
    process.stdout.write(`\r⏳ Waiting ${i}s before next email...   `);
    await new Promise((r) => setTimeout(r, 1000));
  }
  process.stdout.write("\n"); 
}