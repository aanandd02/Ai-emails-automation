export async function sendEmailSafely(to, subject, htmlContent, options = {}) {
  const { onEvent } = options;

  const plainText = `${htmlContent.replace(/<[^>]+>/g, "")}\n    \nView my resume: https://drive.google.com/file/d/1tppKMCDPsWeHdtFIaMD-jWEUdVSz9hW-/view?usp=sharing`;

  try {
    const gasUrl = process.env.GAS_WEB_APP_URL;
    if (!gasUrl) {
      throw new Error("GAS_WEB_APP_URL environment variable is missing.");
    }

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
      let parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        // If response is not JSON, treat as success (old GAS scripts return plain text)
        return { success: true };
      }

      // If GAS explicitly signals failure in the body
      if (parsed && parsed.success === false) {
        const errMsg = parsed.error || parsed.message || "GAS reported failure";
        // Check for quota/rate limit keywords
        const isQuota =
          errMsg.toLowerCase().includes("quota") ||
          errMsg.toLowerCase().includes("limit") ||
          errMsg.toLowerCase().includes("rate") ||
          errMsg.toLowerCase().includes("exceeded");
        const err = new Error(`GAS script error: ${errMsg}`);
        if (isQuota) {
          err.isRateLimit = true;
        }
        throw err;
      }

      return parsed;
    });

    // GAS has a 30-second hard execution limit — timeout at 45s to be safe
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Email sending timed out after 45 seconds")), 45000);
    });

    await Promise.race([mailPromise, timeoutPromise]);
  } catch (error) {
    // Re-throw rate limit errors as-is so caller can handle them specially
    if (error.isRateLimit) throw error;
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
