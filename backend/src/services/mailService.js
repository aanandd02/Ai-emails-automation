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
        // Check for quota/rate limit keywords
        const isQuota =
          errMsg.toLowerCase().includes("quota") ||
          errMsg.toLowerCase().includes("limit") ||
          errMsg.toLowerCase().includes("rate") ||
          errMsg.toLowerCase().includes("exceeded") ||
          errMsg.toLowerCase().includes("service");
        const err = new Error(`GAS script error: ${errMsg}`);
        if (isQuota) {
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
