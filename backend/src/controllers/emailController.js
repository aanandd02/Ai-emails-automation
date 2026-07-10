import { generateEmail } from "../services/aiService.js";
import { sendEmailSafely, waitWithCountdown } from "../services/mailService.js";
import {
  readGoogleSheetData,
  updateStatusInGoogleSheet,
} from "../services/googleSheetService.js";

export async function sendEmailsFromGoogleSheet(options = {}) {
  const { onEvent, shouldStop, limit } = options;
  const stats = {
    totalRows: 0,
    validUsers: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    processed: 0,
  };

  const emit = (event) => onEvent?.(event);

  const ensureNotStopped = () => {
    if (shouldStop?.()) {
      throw new Error("Automation stopped by user");
    }
  };

  try {
    emit({ type: "status", phase: "fetching", message: "Reading Google Sheet data..." });
    const users = await readGoogleSheetData();
    stats.totalRows = users.length;

    emit({
      type: "log",
      level: "success",
      message: `Fetched ${users.length} rows from Google Sheet`,
      stats,
    });

    const allValidUsers = users
      .map((u, index) => ({
        ...u,
        rowNumber: index + 2,
      }))
      .filter((u) => u.name && u.email);

    stats.validUsers = allValidUsers.length;

    // ── Categorise by current sheet status ──────────────────────────────────
    const sentUsers    = allValidUsers.filter(u => u.status?.toLowerCase() === "sent");
    const failedUsers  = allValidUsers.filter(u => u.status?.toLowerCase() === "failed");
    const pendingUsers = allValidUsers.filter(u => !u.status || u.status.trim() === "");

    // Pre-count already-sent rows so stats stay accurate
    stats.skipped   = sentUsers.length;
    stats.processed = sentUsers.length;

    emit({
      type: "progress",
      level: "info",
      message: `📊 Sheet Summary → ✅ ${sentUsers.length} already sent (skipping) | ♻️ ${failedUsers.length} failed (retrying first) | 📬 ${pendingUsers.length} new pending`,
      total: allValidUsers.length,
      stats,
    });

    if (failedUsers.length > 0) {
      emit({
        type: "progress",
        level: "warn",
        message: `🔁 ${failedUsers.length} previously failed contact(s) will be retried before new ones.`,
        stats,
      });
    }

    // Failed contacts first → then new/pending ones
    const toProcess = [...failedUsers, ...pendingUsers];

    if (toProcess.length === 0) {
      emit({
        type: "status",
        phase: "completed",
        level: "success",
        message: "✅ All contacts have already been sent. Nothing left to process.",
        stats,
      });
      return { stopped: false, stats };
    }

    let currentRateLimitBackoff = 10;

    for (let i = 0; i < toProcess.length; i++) {
      ensureNotStopped();

      if (limit && stats.sent >= limit) {
        emit({
          type: "status",
          phase: "stopping",
          level: "info",
          message: `Limit of ${limit} emails reached. Stopping further sending.`,
          stats,
        });
        break;
      }

      const { name, email, status, rowNumber } = toProcess[i];
      const position = i + 1;
      const isRetry = status?.toLowerCase() === "failed";

      emit({
        type: "progress",
        level: "info",
        stage: "preparing",
        message: `[${position}/${toProcess.length}] ${isRetry ? "♻️ Retrying" : "📬 Processing"} ${email} (Generating AI Content...)`,
        currentEmail: email,
        position,
        total: toProcess.length,
        stats,
      });

      try {
        let companyName = "your company";
        if (email.includes("@")) {
          const domain = email.split("@")[1].toLowerCase();
          const genericDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "aol.com"];

          if (!genericDomains.includes(domain)) {
            // Simple extraction: synup.com -> Synup
            let extracted = domain.split(".")[0];
            companyName = extracted.charAt(0).toUpperCase() + extracted.slice(1);
          }
        }

        const { subject, html } = await generateEmail(name, companyName);
        ensureNotStopped();

        const sendResult = await sendEmailSafely(email, subject, html, {
          onEvent: (mailEvent) => {
            // Only emit if it's not a wait message (we handle timer separately)
            if (mailEvent.level !== "wait") {
              emit({
                type: "progress",
                ...mailEvent,
                currentEmail: email,
                position,
                total: toProcess.length,
                stats,
              });
            }
          },
          shouldStop,
        });

        if (!sendResult.sent) {
          // sendResult.sent can be false only if email wasn't actually sent
          stats.failed += 1;
          stats.processed += 1;
          await updateStatusInGoogleSheet(rowNumber, "Failed");
          emit({
            type: "progress",
            level: "error",
            message: `Email not sent to ${email} — GAS returned sent=false`,
            currentEmail: email,
            position,
            total: toProcess.length,
            stats,
          });
          continue;
        }

        await updateStatusInGoogleSheet(rowNumber, "Sent");
        stats.sent += 1;
        stats.processed += 1;

        // Reset rate limit backoff on successful send
        currentRateLimitBackoff = 10;

        emit({
          type: "progress",
          level: "success",
          message: `Successfully dispatched to ${email} (Row ${rowNumber})`,
          currentEmail: email,
          position,
          total: toProcess.length,
          stats,
        });

        if (position < toProcess.length && sendResult.waitSeconds > 0) {
          await waitWithCountdown(sendResult.waitSeconds, {
            onEvent: (mailEvent) =>
              emit({
                type: "progress",
                ...mailEvent,
                currentEmail: email,
                position,
                total: toProcess.length,
                stats,
              }),
            shouldStop,
          });
        }

      } catch (err) {
        if (err.message === "Automation stopped by user") {
          throw err;
        }

        // GAS daily quota exhausted — retrying won't help until tomorrow
        if (err.isDailyQuota) {
          emit({
            type: "progress",
            level: "error",
            message: `⛔ GAS Daily Quota Exhausted! ${stats.sent} emails sent today. Remaining ${toProcess.length - (stats.processed - sentUsers.length)} contacts untouched — they will be processed on next run. Automation stopping.`,
            currentEmail: email,
            position,
            total: toProcess.length,
            stats,
          });
          throw new Error("GAS daily quota exhausted");
        }

        // GAS temporary rate limit — exponential backoff then retry same contact
        if (err.isRateLimit) {
          emit({
            type: "progress",
            level: "warn",
            message: `Rate limit hit. Waiting ${currentRateLimitBackoff}s before retrying ${email}...`,
            currentEmail: email,
            position,
            total: toProcess.length,
            stats,
          });

          await waitWithCountdown(currentRateLimitBackoff, {
            onEvent: (mailEvent) =>
              emit({
                type: "progress",
                ...mailEvent,
                currentEmail: email,
                position,
                total: toProcess.length,
                stats,
              }),
            shouldStop,
          });

          // Exponentially increase backoff for next rate limit (up to ~1 hour)
          currentRateLimitBackoff = Math.min(currentRateLimitBackoff * 2, 3600);

          // Decrement i to retry the same contact on next iteration
          i--;
          continue;
        }

        // ── Any other error → mark Failed in sheet so next run retries it ──
        stats.failed += 1;
        stats.processed += 1;
        emit({
          type: "progress",
          level: "error",
          message: `Failed for ${email}: ${err.message}`,
          currentEmail: email,
          position,
          total: toProcess.length,
          stats,
        });

        await updateStatusInGoogleSheet(rowNumber, "Failed");

        // Wait briefly after a failure before continuing
        if (position < toProcess.length) {
          emit({
            type: "progress",
            level: "info",
            message: `Waiting 5s after failure before continuing...`,
            currentEmail: email,
            position,
            total: toProcess.length,
            stats,
          });
          await waitWithCountdown(5, {
            onEvent: (mailEvent) =>
              emit({
                type: "progress",
                ...mailEvent,
                currentEmail: email,
                position,
                total: toProcess.length,
                stats,
              }),
            shouldStop,
          });
        }
      }
    }

    emit({
      type: "status",
      phase: "completed",
      level: "success",
      message: `✅ Done. Sent: ${stats.sent} | Failed: ${stats.failed} | Skipped (already sent): ${stats.skipped}`,
      stats,
    });

    return { stopped: false, stats };

  } catch (err) {
    if (err.message === "Automation stopped by user") {
      emit({
        type: "status",
        phase: "stopped",
        level: "warn",
        message: "Automation stopped by user",
        stats,
      });
      return { stopped: true, stats };
    }

    // Daily quota hit — treat as a graceful completion (not a crash)
    if (err.message === "GAS daily quota exhausted") {
      emit({
        type: "status",
        phase: "completed",
        level: "warn",
        message: `⚠️ Daily email quota exhausted. ${stats.sent} emails sent. Resume tomorrow to continue from where you left off. Remaining contacts are untouched in the sheet.`,
        stats,
      });
      return { stopped: false, stats };
    }

    emit({
      type: "status",
      phase: "error",
      level: "error",
      message: `Error in workflow: ${err.message}`,
      stats,
    });
    throw err;
  }
}
