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

export async function generateEmail(recipientName = "", companyName = "your company") {
  const greeting = recipientName ? `Hi ${recipientName},` : "Hi,";
  
  const prompt = `
Write an email body matching this EXACT format. 

Company Name: ${companyName}

INSTRUCTIONS:
1. Generate a single SHORT, professional sentence to replace "[AI_COMPLIMENT]" about the company's work (e.g. "the work you all are doing at the intersection of AI and tech staffing is genuinely exciting."). If the company name is very generic (like "your company"), just write "the work you are doing is genuinely exciting."
2. Output EXACTLY the text below, replacing [Company Name] and [AI_COMPLIMENT]. Do NOT use Markdown backticks. Do NOT use HTML tags.

I came across your profile while exploring opportunities at ${companyName} - [AI_COMPLIMENT]

I'm Anand, a final-year ECE student at IIIT Nagpur with backend engineering experience across two internships:

• Backend Intern at Synup - optimized MySQL transactions and built atomic reservation logic (Node.js, AWS Lambda)
• Backend Intern at BrandX - worked on MongoDB-based data pipelines
• LeetCode Knight - Global top 2.44%, rating 2006

I'm actively looking for SDE-1 roles and would love to explore if there's a fit at ${companyName} or with any of your client companies. Would you be open to a quick 10-minute call?
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
        const fetchPromise = groq.chat.completions.create({
          model: MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.75,
          max_tokens: 250,
        });

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            const err = new Error("Groq API timeout");
            err.status = 408;
            reject(err);
          }, 15000);
        });

        completion = await Promise.race([fetchPromise, timeoutPromise]);
        break; // Success
      } catch (error) {
        // Groq rate limit is usually 429 Too Many Requests
        if (error.status === 429 || (error.message && error.message.includes('429'))) {
          const errMsg = error.message || JSON.stringify(error);
          let waitSeconds = backoff / 1000;
          const match = errMsg.match(/try again in (?:(\d+)m)?([\d.]+)s/);
          if (match) {
            const minutes = parseInt(match[1] || '0', 10);
            const seconds = parseFloat(match[2] || '0');
            waitSeconds = Math.ceil(minutes * 60 + seconds) + 5; // 5s buffer
          } else {
            backoff *= 2;
          }

          const rlError = new Error(errMsg);
          rlError.isRateLimit = true;
          rlError.waitSeconds = waitSeconds;
          throw rlError;
        } else {
          retries--;
          if (retries < 0) {
            throw error;
          }
          logger.warn(`Groq API error (${error.message}). Retries left: ${retries}`);
          await new Promise(resolve => setTimeout(resolve, 2000));
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
    if (error.isRateLimit) {
      throw error;
    }
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
    .replace(/\r/g, "")
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