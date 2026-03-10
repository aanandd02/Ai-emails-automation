import transporter from "../config/mailConfig.js";
import { isEmailAlreadySent, saveSentEmail } from "./sentEmailService.js";

export async function sendEmailSafely(to, subject, htmlContent, options = {}) {
  const { onEvent } = options;

  if (await isEmailAlreadySent(to)) {
    onEvent?.({
      level: "info",
      message: `Skipping already sent email: ${to}`,
    });
    return { sent: false, waitSeconds: 0 };
  }

  const plainText = `${htmlContent.replace(/<[^>]+>/g, "")}
    
View my resume: https://drive.google.com/file/d/16njcwPjtBjIbA6eycBdHgqXWgik4kd4K/view?usp=sharing`;

  try {
    await transporter.sendMail({
      from: `"Anand Shukla" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html: htmlContent,
      text: plainText,
    });
  } catch (error) {
    throw new Error(`Failed to send email to ${to}: ${error.message}`);
  }

  const wait = Math.floor(Math.random() * 25000) + 20000;
  const seconds = Math.round(wait / 1000);
  onEvent?.({
    level: "success",
    message: `Email sent successfully to ${to}. Waiting ${seconds}s before next send.`,
  });

  await saveSentEmail(to);

  return { sent: true, waitSeconds: seconds };
}

export async function waitWithCountdown(seconds, options = {}) {
  const { onEvent, shouldStop } = options;

  for (let i = seconds; i > 0; i--) {
    if (shouldStop?.()) {
      onEvent?.({
        level: "warn",
        message: "Stop requested while waiting between emails.",
      });
      throw new Error("Automation stopped by user");
    }

    onEvent?.({
      level: "wait",
      stage: "waiting",
      message: `Waiting ${i}s before next email...`,
      remainingSeconds: i,
    });

    await new Promise((r) => setTimeout(r, 1000));
  }
}
