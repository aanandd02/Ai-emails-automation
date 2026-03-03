import { generateEmail, generateUniqueSubject } from "../services/aiService.js";
import { sendEmailSafely } from "../services/mailService.js";
import { isEmailAlreadySent } from "../services/sentEmailService.js";
import {
  readGoogleSheetData,
  updateStatusInGoogleSheet,
} from "../services/googleSheetService.js";

export async function sendEmailsFromGoogleSheet() {
  try {
    const users = await readGoogleSheetData();
    console.log(`✅ Fetched ${users.length} rows from Google Sheet`);

    const validUsers = users
      .map((u, index) => ({
        ...u,
        rowNumber: index + 2,
      }))
      .filter((u) => u.name && u.email);

    console.log(`📊 Valid users ready: ${validUsers.length}`);

    for (let i = 0; i < validUsers.length; i++) {
      const { name, email, status, rowNumber } = validUsers[i];
      const alreadySent =
        status?.toLowerCase() === "sent" || (await isEmailAlreadySent(email));

      if (alreadySent) {
        continue;
      }

      console.log(`📨 (${i + 1}/${validUsers.length}) Preparing email for ${email}...`);

      try {
        const subject = await generateUniqueSubject(name);
        const emailBody = await generateEmail(name);

        const sent = await sendEmailSafely(email, subject, emailBody);
        if (!sent) {
          continue;
        }

        await updateStatusInGoogleSheet(rowNumber, "Sent");
        console.log(`✅ Marked ${email} as Sent (Row ${rowNumber})`);
      } catch (err) {
        console.error(`❌ Failed for ${email}: ${err.message}`);
        await updateStatusInGoogleSheet(rowNumber, "Failed");
      }
    }

    console.log("🎉 All emails processed successfully!");
  } catch (err) {
    console.error("❌ Error in workflow:", err.message);
  }
}
