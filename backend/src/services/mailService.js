import transporter from "../config/mailConfig.js";

export async function sendEmailSafely(to, subject, htmlContent, options = {}) {
  const { onEvent } = options;

  const plainText = `${htmlContent.replace(/<[^>]+>/g, "")}
    
View my resume: https://drive.google.com/file/d/1tppKMCDPsWeHdtFIaMD-jWEUdVSz9hW-/view?usp=sharing`;

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

  return { sent: true, waitSeconds: seconds };
}

export async function waitWithCountdown(seconds, options = {}) {
  const { onEvent, shouldStop } = options;
  const targetTimestamp = Date.now() + seconds * 1000;

  onEvent?.({
    level: "wait",
    stage: "waiting",
    remainingSeconds: seconds,
    targetTimestamp,
  });

  for (let i = seconds; i > 0; i--) {
    if (shouldStop?.()) {
      onEvent?.({
        level: "warn",
        message: "Stop requested while waiting between emails.",
      });
      throw new Error("Automation stopped by user");
    }
    // We still loop to check shouldStop every second, but we don't send events anymore
    await new Promise((r) => setTimeout(r, 1000));
  }
}
