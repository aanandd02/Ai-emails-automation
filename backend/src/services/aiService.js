import { groq } from "../config/groqConfig.js";
import logger from "../utils/logger.js";

const MODEL = "llama-3.3-70b-versatile";

const STYLES = [
  "confident and concise",
  "friendly but professional",
  "warm and engaging",
  "polite and enthusiastic",
];

const SUBJECTS = [
  "SDE-1 Opening | LeetCode Knight (Rating 2006) | AWS & Backend Engineer",
  "Backend Engineer | LeetCode Knight (Top 2.44%) | AWS Serverless + Node.js",
  "SDE-1 Application | AWS Lambda · Node.js · LeetCode Knight | Anand Shukla",
  "Software Development Engineer | LeetCode Knight (2006) | IIIT Nagpur",
  "SDE-1 Role | Serverless Microservices · Node.js · MongoDB | Anand Shukla",
];

export async function generateUniqueSubject() {
  return SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)];
}

export async function generateEmail(recipientName = "") {
  const style = STYLES[Math.floor(Math.random() * STYLES.length)];
  const greeting = recipientName ? `Hi ${recipientName},` : "Hi,";
  const nameContext = recipientName
    ? `The recipient's name is ${recipientName}. The greeting "Hi ${recipientName}," is already added — do NOT use their name anywhere inside the email body.`
    : "No recipient name provided. Use a general but professional tone.";

  const prompt = `
Write a SHORT, PROFESSIONAL cold email body (MAX 80 WORDS) for a Software Development Engineer (SDE-1) job application.

Follow this structure:
Sentence 1 — Intro: Start with "I'm Anand, a final-year ECE student at IIIT Nagpur" and mention LeetCode Knight (top 2.44% globally, rating 2006).
Sentence 2 & 3 — Work Experience: Highlight your Backend Internship experience at <b>Synup</b> and/or <b>BrandX</b>. Mention specific roles like "Backend Engineer Intern" and include high-impact tech (AWS Lambda, MySQL, Node.js, MongoDB).
Sentence 4 — Closing: A short, natural sentence expressing interest in connecting for SDE-1 opportunities. The resume and portfolio are already linked in the signature.

Hard Rules:
- CRITICAL: Do NOT start with "Hi", "Hello", or any greeting — greeting is already added above this body
- Do NOT write "I'm Anand Shukla" — use only "I'm Anand"
- Do NOT mention any specific company being applied to
- Mention <b>Synup</b> and <b>BrandX</b> prominently if possible.
- Use <b> tags for company names.
- Keep it flowy and human, not like a template.
- Tone: ${style}
- ${nameContext}

Detailed Work Experience for Reference:

1. **Synup** (Backend Engineer Intern | 6 months):
   - Tracked and fixed production race conditions in event-driven AWS Lambda pipelines.
   - Optimized MySQL transactions for high-concurrency services.
   - Key Achievement: Reduced pipeline failure rate by 40%.

2. **BrandX** (Backend Developer Intern):
   - Built atomic reservation logic for a high-traffic booking platform (Kumbh Mela project).
   - Tech: Node.js, MongoDB, REST APIs.
   - Key Achievement: Improved API response times by 35% under peak load.

Output only the email body plain HTML fragment — no markdown, no backticks, no commentary.
`;


  const myName = "Anand Shukla";

  const contact = {
    phone: "+91-9076823328",
    email: "aanandd9076@gmail.com",
    portfolio: "https://anand-shukla02.onrender.com/",
    resume:
      "https://drive.google.com/file/d/1tppKMCDPsWeHdtFIaMD-jWEUdVSz9hW-/view?usp=sharing",
  };
  try {
    logger.info(`🤖 Using Groq model: ${MODEL}`);
    logger.info(`👤 Recipient: ${recipientName || "unknown"}`);

    let completion;
    let retries = 3;
    let backoff = 5000; // start with 5s delay

    while (retries >= 0) {
      try {
        completion = await groq.chat.completions.create({
          model: MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.75,
          max_tokens: 250,
        });
        break; // Success
      } catch (error) {
        // Groq rate limit is usually 429 Too Many Requests
        if (error.status === 429 && retries > 0) {
          logger.warn(`⚠️ Groq API rate limit reached. Retrying in ${backoff/1000}s...`);
          await new Promise((resolve) => setTimeout(resolve, backoff));
          retries--;
          backoff *= 2;
        } else {
          throw error;
        }
      }
    }

    const text = completion.choices[0].message.content;

    logger.info("✅ Email generated");

    return {
      subject: SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)],
      html: buildBeautifulTemplate(greeting, text, { myName, ...contact }),
    };
  } catch (error) {
    logger.error("❌ Groq generation failed:", error.message);
    // Include error message to make it visible in logs
    throw new Error(`Email content generation failed: ${error.message}`);
  }
}

function buildBeautifulTemplate(
  greeting,
  emailText,
  { myName, phone, email, portfolio, resume }
) {
  const body = emailText
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`/g, "")
    .replace(/\n{2,}/g, "<br><br>")
    .replace(/\n/g, "<br>")
    .trim();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Segoe UI,Arial,sans-serif;">

<div style="max-width:620px;margin:32px auto;background:#ffffff;padding:32px;border-radius:8px;border:1px solid #e5e5e5;">

  <!-- Personalised Greeting -->
  <div style="font-size:15px;line-height:1.7;color:#333;margin-bottom:12px;">
    ${greeting}
  </div>

  <!-- AI-Generated Body -->
  <div style="font-size:15px;line-height:1.8;color:#333;margin-bottom:20px;">
    ${body}
  </div>

  <!-- Signature -->
  <table style="margin-top:20px;padding-top:16px;border-top:1px solid #e8e8e8;width:100%;border-collapse:collapse;">
    <tr>
      <td style="width:44px;vertical-align:middle;padding-right:12px;">
        <table style="border-collapse:collapse;"><tr><td style="width:40px;height:40px;border-radius:50%;background:#dbeafe;text-align:center;vertical-align:middle;font-size:13px;font-weight:700;color:#1d4ed8;letter-spacing:0.5px;line-height:40px;">AS</td></tr></table>
      </td>
      <td style="vertical-align:middle;">
        <div style="font-size:14px;font-weight:600;color:#111;line-height:1.4;">${myName}</div>
        <div style="font-size:12px;color:#888;margin-top:2px;">
          SDE &nbsp;·&nbsp; IIIT Nagpur &nbsp;|&nbsp;
          <a href="tel:${phone}" style="color:#888;text-decoration:none;">${phone}</a> &nbsp;|&nbsp;
          <a href="mailto:${email}" style="color:#888;text-decoration:none;">${email}</a>
        </div>
        <div style="margin-top:8px;">
          <a href="${portfolio}" style="display:inline-block;padding:4px 12px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:4px;font-size:11px;font-weight:500;margin-right:6px;">Portfolio</a>
          <a href="${resume}" style="display:inline-block;padding:4px 12px;background:#0a66c2;color:#ffffff;text-decoration:none;border-radius:4px;font-size:11px;font-weight:500;">Resume</a>
        </div>
      </td>
    </tr>
  </table>

</div>

</body>
</html>
`;
}