import profile from "../config/profile.js";

export async function sendEmailSafely(to, subject, htmlContent, options = {}) {
  const { onEvent } = options;

  const strippedBody = htmlContent
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  const plainText = `${strippedBody}

---
${profile.name} | Backend & AI Engineer | IIIT Nagpur ('26) | LeetCode Knight (2006)
Phone: ${profile.phone} | Email: ${profile.email}
Resume: ${profile.links.resume}
Portfolio: ${profile.links.portfolio}
LinkedIn: ${profile.links.linkedin}
GitHub: ${profile.links.github}
LeetCode: ${profile.links.leetcode}`;

  try {
    const gasUrl = process.env.GAS_WEB_APP_URL;

    if (gasUrl) {
      const mailPromise = fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          subject,
          html: htmlContent,
          text: plainText,
        }),
      }).then(async (res) => {
        // Get raw text first so we can inspect it even if JSON parse fails
        const rawText = await res.text();

        if (!res.ok) {
          throw new Error(`GAS HTTP error ${res.status}: ${rawText.slice(0, 300)}`);
        }

        // GAS can return HTTP 200 with an error body — must check content
        // GAS script returns: {sent: true} on success, {error: "msg"} on failure
        let parsed;
        try {
          parsed = JSON.parse(rawText);
        } catch {
          // Non-JSON response (e.g. plain text error) — treat as failure
          throw new Error(`GAS returned non-JSON response: ${rawText.slice(0, 200)}`);
        }

        // GAS error case: { error: "some message" }
        if (parsed && parsed.error) {
          const errMsg = parsed.error;
          const errLower = errMsg.toLowerCase();

          // Daily quota exhausted — retrying won't help until tomorrow
          const isDailyQuota =
            errLower.includes("one day") ||
            errLower.includes("daily") ||
            (errLower.includes("gmail") && errLower.includes("too many")) ||
            (errLower.includes("service invoked too many"));

          // Temporary rate limit — can retry after a short wait
          const isRateLimit =
            !isDailyQuota &&
            (errLower.includes("quota") ||
              errLower.includes("limit") ||
              errLower.includes("rate") ||
              errLower.includes("exceeded") ||
              errLower.includes("service"));

          const err = new Error(`GAS script error: ${errMsg}`);
          if (isDailyQuota) {
            err.isDailyQuota = true;
            err.isRateLimit = false;
          } else if (isRateLimit) {
            err.isRateLimit = true;
          }
          throw err;
        }

        // GAS success case: { sent: true }
        if (!parsed || parsed.sent !== true) {
          throw new Error(`GAS returned unexpected response: ${rawText.slice(0, 200)}`);
        }

        return parsed;
      });

      // GAS has a 30-second hard execution limit — timeout at 45s to be safe
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Email sending timed out after 45 seconds")), 45000);
      });

      await Promise.race([mailPromise, timeoutPromise]);
    } else if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASS) {
      // Fallback: Direct Nodemailer via Gmail SMTP
      const { default: transporter } = await import("../config/mailConfig.js");
      const mailPromise = transporter.sendMail({
        from: `"${profile.name}" <${process.env.GMAIL_USER}>`,
        to,
        subject,
        html: htmlContent,
        text: plainText,
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Email sending timed out after 30 seconds")), 30000);
      });

      await Promise.race([mailPromise, timeoutPromise]);
    } else {
      throw new Error(
        "No email dispatch method available: please set GAS_WEB_APP_URL or (GMAIL_USER and GMAIL_APP_PASS) in .env"
      );
    }
  } catch (error) {
    // Re-throw rate limit AND daily quota errors as-is so caller can handle them specially
    if (error.isDailyQuota || error.isRateLimit) throw error;
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
