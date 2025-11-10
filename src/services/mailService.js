// src/services/mailService.js
import transporter from "../config/mailConfig.js";
import { isEmailAlreadySent, saveSentEmail } from "./sentEmailService.js";

/**
 * 📬 Safely sends an email with HTML + plain text fallback
 */
export async function sendEmailSafely(to, subject, htmlContent) {
  try {
    // 🚫 Skip if already sent
    if (await isEmailAlreadySent(to)) {
      console.log(`📭 Skipping ${to} — already sent before.`);
      return;
    }

    // 📝 Plain text fallback (improves Gmail trust score)
    const plainText = `${htmlContent.replace(/<[^>]+>/g, "")}
    
View my resume: https://drive.google.com/file/d/1dqHj0e59CKZQNcpaXIuTdIxhZNoeIa7M/view?usp=sharing`;

    // ✉️ Send email
    await transporter.sendMail({
      from: `"Anand Shukla" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html: htmlContent,
      text: plainText,
    });

    // ✅ Log + save sent email
    const wait = Math.floor(Math.random() * 25000) + 20000; // random 20–45 sec
    const seconds = Math.round(wait / 1000);
    console.log(
      `✅ Email sent successfully to ${to} — waiting ${seconds}s before next send...`
    );

    await saveSentEmail(to);

    // ⏳ Live countdown before next send
    await waitWithCountdown(seconds);
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
  }
}

/**
 * 🕒 Live countdown timer in terminal (overwrites same line)
 */
async function waitWithCountdown(seconds) {
  for (let i = seconds; i > 0; i--) {
    process.stdout.write(`\r⏳ Waiting ${i}s before next email...   `);
    await new Promise((r) => setTimeout(r, 1000));
  }
  process.stdout.write("\n"); // move to next line after countdown ends
}
