import { generateEmail, generateUniqueSubject } from "../services/aiService.js";
import { sendEmailSafely, waitWithCountdown } from "../services/mailService.js";
import {
  readGoogleSheetData,
  updateStatusInGoogleSheet,
} from "../services/googleSheetService.js";

export async function sendEmailsFromGoogleSheet(options = {}) {
  const { onEvent, shouldStop } = options;
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

    const validUsers = users
      .map((u, index) => ({
        ...u,
        rowNumber: index + 2,
      }))
      .filter((u) => u.name && u.email);

    stats.validUsers = validUsers.length;

    emit({
      type: "progress",
      level: "info",
      message: `Valid users ready: ${validUsers.length}`,
      total: validUsers.length,
      stats,
    });

    let skipStreakCount = 0;
    let skipStreakStartPosition = 0;
    let skipStreakLastEmail = "";

    const flushSkipStreak = (position, force = false) => {
      if (skipStreakCount === 0) {
        return;
      }

      if (skipStreakCount === 1 && !force) {
        return;
      }

      emit({
        type: "progress",
        level: "warn",
        message:
          skipStreakCount === 1
            ? `Skipping ${skipStreakLastEmail} (already marked sent).`
            : `Skipped ${skipStreakCount} already-sent contacts (rows ${skipStreakStartPosition}-${position - 1}). Last: ${skipStreakLastEmail}`,
        currentEmail: skipStreakLastEmail,
        position: position - 1,
        total: validUsers.length,
        stats,
      });

      skipStreakCount = 0;
      skipStreakStartPosition = 0;
      skipStreakLastEmail = "";
    };

    for (let i = 0; i < validUsers.length; i++) {
      ensureNotStopped();

      const { name, email, status, rowNumber } = validUsers[i];
      const position = i + 1;

      const alreadySent = status?.toLowerCase() === "sent";

      if (alreadySent) {
        stats.skipped += 1;
        stats.processed += 1;
        skipStreakCount += 1;
        if (skipStreakStartPosition === 0) {
          skipStreakStartPosition = position;
        }
        skipStreakLastEmail = email;
        if (skipStreakCount % 25 === 0) {
          flushSkipStreak(position + 1);
        }
        continue;
      }

      flushSkipStreak(position);

      emit({
        type: "progress",
        level: "info",
        stage: "preparing",
        message: `(${position}/${validUsers.length}) Preparing email for ${email}...`,
        currentEmail: email,
        position,
        total: validUsers.length,
        stats,
      });

      try {
        emit({
          type: "progress",
          level: "info",
          stage: "generating",
          message: `Generating content for ${email}...`,
          currentEmail: email,
          position,
          total: validUsers.length,
          stats,
        });

        const subject = await generateUniqueSubject(name);
        const emailBody = await generateEmail(name);

        const sendResult = await sendEmailSafely(email, subject, emailBody, {
          onEvent: (mailEvent) =>
            emit({
              type: "progress",
              ...mailEvent,
              currentEmail: email,
              position,
              total: validUsers.length,
              stats,
            }),
          shouldStop,
        });

        if (!sendResult.sent) {
          stats.skipped += 1;
          stats.processed += 1;
          continue;
        }

        await updateStatusInGoogleSheet(rowNumber, "Sent");
        stats.sent += 1;
        stats.processed += 1;

        emit({
          type: "progress",
          level: "success",
          message: `Marked ${email} as Sent (Row ${rowNumber})`,
          currentEmail: email,
          position,
          total: validUsers.length,
          stats,
        });

        if (position < validUsers.length && sendResult.waitSeconds > 0) {
          await waitWithCountdown(sendResult.waitSeconds, {
            onEvent: (mailEvent) =>
              emit({
                type: "progress",
                ...mailEvent,
                currentEmail: email,
                position,
                total: validUsers.length,
                stats,
              }),
            shouldStop,
          });
        }

      } catch (err) {
        if (err.message === "Automation stopped by user") {
          throw err;
        }

        stats.failed += 1;
        stats.processed += 1;
        emit({
          type: "progress",
          level: "error",
          message: `Failed for ${email}: ${err.message}`,
          currentEmail: email,
          position,
          total: validUsers.length,
          stats,
        });

        await updateStatusInGoogleSheet(rowNumber, "Failed");
      }
    }

    flushSkipStreak(validUsers.length + 1, true);

    emit({
      type: "status",
      phase: "completed",
      level: "success",
      message: "All emails processed successfully",
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
